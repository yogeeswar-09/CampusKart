export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  context: SecurityRuleContext;
  constructor(context: SecurityRuleContext) {
    super(`FirestorePermissionError: Missing or insufficient permissions at ${context.path} for ${context.operation}`);
    this.context = context;
    this.name = 'FirestorePermissionError';
  }
}
