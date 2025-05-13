"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommitType = exports.QueueItemPriority = void 0;
var QueueItemPriority;
(function (QueueItemPriority) {
    QueueItemPriority["LOW"] = "Low";
    QueueItemPriority["MEDIUM"] = "Medium";
    QueueItemPriority["HIGH"] = "High";
})(QueueItemPriority || (exports.QueueItemPriority = QueueItemPriority = {}));
var CommitType;
(function (CommitType) {
    CommitType["ALL_OR_NOTHING"] = "AllOrNothing";
    CommitType["STOP_ON_FIRST_FAILURE"] = "StopOnFirstFailure";
    CommitType["PROCESS_ALL_INDEPENDENTLY"] = "ProcessAllIndependently";
})(CommitType || (exports.CommitType = CommitType = {}));
