import {
  Expression,
  set,
  ref,
  obj,
  str,
  ifElse,
  compoundExpression,
  methodCall,
  qref,
  toJson,
  printBlock,
  iff,
  int,
  not,
  equals,
  bool,
  and,
  nul,
} from 'graphql-mapping-template';
import { ResourceConstants } from 'graphql-transformer-common';
/**
 * Generate get query resolver template
 */
export const generateGetRequestTemplate = (): string => {
  const statements: Expression[] = [
    set(ref('GetRequest'), obj({ version: str('2018-05-29'), operation: str('GetItem') })),
    ifElse(
      ref('ctx.stash.metadata.modelObjectKey'),
      set(ref('key'), ref('ctx.stash.metadata.modelObjectKey')),
      compoundExpression([set(ref('key'), obj({ id: methodCall(ref('util.dynamodb.toDynamoDB'), ref('ctx.args.id')) }))]),
    ),
    qref(methodCall(ref('GetRequest.put'), str('key'), ref('key'))),
    toJson(ref('GetRequest')),
  ];

  return printBlock('Get Request template')(compoundExpression(statements));
};

export const generateListRequestTemplate = (): string => {
  const requestVariable = 'ListRequest';
  const modelQueryObj = 'ctx.stash.modelQueryExpression';
  const indexNameVariable = 'ctx.stash.metadata.index';
  const expression = compoundExpression([
    set(ref('limit'), methodCall(ref(`util.defaultIfNull`), ref('context.args.limit'), int(100))),
    set(
      ref(requestVariable),
      obj({
        version: str('2018-05-29'),
        limit: ref('limit'),
      }),
    ),
    iff(ref('context.args.nextToken'), set(ref(`${requestVariable}.nextToken`), ref('context.args.nextToken'))),
    iff(
      ref('context.args.filter'),
      compoundExpression([
        set(
          ref(`filterExpression`),
          methodCall(ref('util.parseJson'), methodCall(ref('util.transform.toDynamoDBFilterExpression'), ref('ctx.args.filter'))),
        ),
        iff(
          not(methodCall(ref('util.isNullOrBlank'), ref('filterExpression.expression'))),
          compoundExpression([
            iff(
              equals(methodCall(ref('filterEpression.expressionValues.size')), int(0)),
              qref(methodCall(ref('filterEpression.remove'), str('expressionValues'))),
            ),
            set(ref(`${requestVariable}.filter`), ref(`filterExpression`)),
          ]),
        ),
      ]),
    ),
    ifElse(
      and([
        not(methodCall(ref('util.isNull'), ref(modelQueryObj))),
        not(methodCall(ref('util.isNullOrEmpty'), ref(`${modelQueryObj}.expression`))),
      ]),
      compoundExpression([
        qref(methodCall(ref(`${requestVariable}.put`), str('operation'), str('Query'))),
        qref(methodCall(ref(`${requestVariable}.put`), str('query'), ref(modelQueryObj))),
        ifElse(
          and([not(methodCall(ref('util.isNull'), ref('ctx.args.sortDirection'))), equals(ref('ctx.args.sortDirection'), str('DESC'))]),
          set(ref(`${requestVariable}.scanIndexForward`), bool(false)),
          set(ref(`${requestVariable}.scanIndexForward`), bool(true)),
        ),
      ]),
      qref(methodCall(ref(`${requestVariable}.put`), str('operation'), str('Scan'))),
    ),
    iff(not(methodCall(ref('util.isNull'), ref(indexNameVariable))), set(ref(`${requestVariable}.IndexName`), ref(indexNameVariable))),
    toJson(ref(requestVariable)),
  ]);
  return printBlock('List Request')(expression);
};

export const generateSyncRequestTemplate = (): string => {
  return printBlock('Sync Request template')(
    compoundExpression([
      obj({
        version: str('2018-05-29'),
        operation: str('Sync'),
        filter: ifElse(ref('context.args.filter'), ref('util.transform.toDynamoDBFilterExpression($ctx.args.filter)'), nul()),
        limit: ref(`util.defaultIfNull($ctx.args.limit, ${ResourceConstants.DEFAULT_SYNC_QUERY_PAGE_LIMIT})`),
        lastSync: ref('util.toJson($util.defaultIfNull($ctx.args.lastSync, null))'),
        nextToken: ref('util.toJson($util.defaultIfNull($ctx.args.nextToken, null))'),
      }),
    ]),
  );
};
