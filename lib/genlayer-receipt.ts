export type GenLayerExecutionOutcome = "SUCCESS" | "FAILED" | "UNKNOWN";

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.toUpperCase() : "";
}

function receiptEntries(receipt: Record<string, unknown>): Record<string, unknown>[] {
  const consensus = record(receipt.consensus_data) ?? record(receipt.consensusData);
  if (!consensus) return [];

  const raw = consensus.leader_receipt ?? consensus.leaderReceipt;
  const entries = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const records = entries.map(record).filter((entry): entry is Record<string, unknown> => Boolean(entry));
  const leaders = records.filter((entry) => text(entry.mode) === "LEADER");
  return leaders.length ? leaders : records.slice(0, 1);
}

function entryOutcome(entry: Record<string, unknown>): GenLayerExecutionOutcome {
  const result = record(entry.result);
  const resultStatus = text(result?.status);
  const executionResult = text(entry.execution_result ?? entry.executionResult);
  const genvmResult = record(entry.genvm_result ?? entry.genvmResult);

  if (
    resultStatus === "ERROR" ||
    resultStatus === "ROLLBACK" ||
    executionResult.includes("ERROR") ||
    executionResult.includes("FAIL") ||
    genvmResult?.error_code != null ||
    genvmResult?.errorCode != null ||
    genvmResult?.raw_error != null ||
    genvmResult?.rawError != null
  ) {
    return "FAILED";
  }
  if (resultStatus === "RETURN" || executionResult === "SUCCESS") return "SUCCESS";
  return "UNKNOWN";
}

export function genLayerExecutionOutcome(receiptValue: unknown): GenLayerExecutionOutcome {
  const receipt = record(receiptValue);
  if (!receipt) return "UNKNOWN";

  const sdkResult = text(
    receipt.txExecutionResultName ?? receipt.tx_execution_result_name,
  );
  if (sdkResult === "FINISHED_WITH_ERROR") return "FAILED";
  if (sdkResult === "FINISHED_WITH_RETURN") return "SUCCESS";

  for (const entry of receiptEntries(receipt)) {
    const outcome = entryOutcome(entry);
    if (outcome !== "UNKNOWN") return outcome;
  }
  return "UNKNOWN";
}
