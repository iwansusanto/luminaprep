class AgentError(Exception):
    pass


class LLMError(AgentError):
    pass


class VectorDBError(AgentError):
    pass


class QuizGenerationError(AgentError):
    pass


class FeedbackGenerationError(AgentError):
    pass


class IngestionError(AgentError):
    pass
