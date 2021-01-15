class ServiceError extends Error {
    constructor(...params) {
        super(...params);
        this.name = `ServiceError`;
    }
}

const exceptions = {
    ServiceError: ServiceError
};

module.exports = exceptions;