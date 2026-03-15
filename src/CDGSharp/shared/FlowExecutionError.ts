/*
 * FlowExecutionError module features.
 * Contains implementation for flow execution error.
 */

export class FlowExecutionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "FlowExecutionError";
  }
}
