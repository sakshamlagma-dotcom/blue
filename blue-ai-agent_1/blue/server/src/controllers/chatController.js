import { runAgent } from "../agents/agentEngine.js";
import {
  getConversation,
  createConversation,
  addMessage,
  historyForModel,
} from "../services/conversationService.js";

// POST /api/agent/run  (also backs POST /api/chat)
export async function runAgentTurn(req, res, next) {
  try {
    const { message, conversationId, mode = "agent", attachments = [] } = req.body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "A non-empty 'message' is required." });
    }

    let conversation = conversationId ? getConversation(conversationId) : null;
    if (!conversation) {
      const title = message.slice(0, 60);
      conversation = createConversation({ title, mode });
    }

    addMessage({
      conversationId: conversation.id,
      role: "user",
      content: message,
      attachments,
    });

    const history = historyForModel(conversation.id, 20).slice(0, -1); // exclude the message just added
    const steps = [];

    const { text, toolCalls } = await runAgent({
      history,
      userMessage: message,
      mode,
      onStep: (s) => steps.push(s),
    });

    const assistantMessage = addMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: text,
      steps,
      toolCalls,
    });

    res.json({
      conversationId: conversation.id,
      message: assistantMessage,
      steps,
    });
  } catch (err) {
    next(err);
  }
}
