export const createEvent = (type, aggregateId, aggregateType, payload, metadata = {}) => ({
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: metadata.userId || "system",
    version: 1,
    type,
    aggregateId,
    aggregateType,
    payload,
    metadata: {
        correlationId: metadata.correlationId,
        causationId: metadata.causationId,
        userId: metadata.userId,
        sessionId: metadata.sessionId,
        ip: metadata.ip,
        userAgent: metadata.userAgent,
        tags: metadata.tags || []
    }
});
//# sourceMappingURL=events.js.map