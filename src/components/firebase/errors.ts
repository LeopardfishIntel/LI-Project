'use client';
import { getAuth } from 'firebase/auth';

type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  public readonly request: any;

  constructor(context: SecurityRuleContext) {
    const auth = getAuth().currentUser;
    const requestObject = {
      auth: auth ? { uid: auth.uid, email: auth.email } : null,
      method: context.operation,
      path: `/databases/(default)/documents/${context.path}`,
      resource: context.requestResourceData ? { data: context.requestResourceData } : undefined,
    };
    super(`Missing or insufficient permissions: ${JSON.stringify(requestObject, null, 2)}`);
    this.name = 'FirebaseError';
    this.request = requestObject;
  }
}
