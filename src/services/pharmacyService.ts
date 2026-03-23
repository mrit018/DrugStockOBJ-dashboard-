// =============================================================================
// BMS Session KPI Dashboard - Pharmacy Data Fetching Service
// (Reports and Procurement Planning)
// =============================================================================

import type {
  ConnectionConfig,
  DatabaseType,
  DrugUsage,
  ProcurementPlanning,
  SqlApiResponse,
} from '@/types';

import { queryBuilder } from '@/services/queryBuilder';
import { executeSqlViaApi } from '@/services/bmsSession';

/**
 * Map raw {@link SqlApiResponse} rows into a typed array using the supplied
 * mapper function.
 */
function parseQueryResponse<T>(
  response: SqlApiResponse,
  mapper: (row: Record<string, unknown>) => T,
): T[] {
  if (!response.data || !Array.isArray(response.data)) {
    return [];
  }
  return response.data.map(mapper);
}

// ---------------------------------------------------------------------------
// Drug Stock Usage Report
// ---------------------------------------------------------------------------

/**
 * Get drug usage summary for a given date range.
 * (รายงานสต๊อกการใช้ยา)
 */
export async function getDrugUsageReport(
  config: ConnectionConfig,
  _dbType: DatabaseType,
  startDate: string,
  endDate: string,
): Promise<DrugUsage[]> {
  const sql =
    `SELECT d.icode, d.name as drug_name, d.units as unit, ` +
    `SUM(o.qty) as total_qty, ` +
    `SUM(o.qty * o.unitprice) as total_cost ` +
    `FROM opitemrece o ` +
    `LEFT JOIN drugitems d ON o.icode = d.icode ` +
    `WHERE o.vstdate >= '${startDate}' AND o.vstdate <= '${endDate}' ` +
    `AND d.icode IS NOT NULL ` +
    `GROUP BY d.icode, d.name, d.units ` +
    `ORDER BY total_qty DESC ` +
    `LIMIT 100`;
  
  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => ({
    icode: String(row['icode'] ?? ''),
    name: String(row['drug_name'] ?? 'Unknown'),
    unit: String(row['unit'] ?? ''),
    totalQty: Number(row['total_qty'] ?? 0),
    totalCost: Number(row['total_cost'] ?? 0),
  }));
}

// ---------------------------------------------------------------------------
// Procurement Planning Estimation
// ---------------------------------------------------------------------------

/**
 * Get procurement planning estimation (AMC and suggested order quantity).
 * (วางแผนประมาณการสั่งยา เพิ่มเติม)
 */
export async function getProcurementPlanning(
  config: ConnectionConfig,
  dbType: DatabaseType,
): Promise<ProcurementPlanning[]> {
  // AMC is usually calculated from last 3 months
  const monthsForAmc = 3;
  const amcStartDate = queryBuilder.dateSubtract(dbType, 90);
  
  const sql =
    `SELECT d.icode, d.name as drug_name, d.units as unit, ` +
    `COALESCE(d.quantity, 0) as stock_qty, ` +
    `COALESCE(usage.total_qty, 0) / ${monthsForAmc} as amc ` +
    `FROM drugitems d ` +
    `LEFT JOIN ( ` +
    `  SELECT icode, SUM(qty) as total_qty ` +
    `  FROM opitemrece ` +
    `  WHERE vstdate >= ${amcStartDate} ` +
    `  GROUP BY icode ` +
    `) usage ON d.icode = usage.icode ` +
    `WHERE d.istatus = 'Y' ` +
    `ORDER BY amc DESC ` +
    `LIMIT 100`;

  const response = await executeSqlViaApi(sql, config);
  return parseQueryResponse(response, (row) => {
    const amc = Number(row['amc'] ?? 0);
    const stockQty = Number(row['stock_qty'] ?? 0);
    
    // Simple logic: maintain 2 months of stock (AMC * 2)
    // Suggested = (AMC * 2) - current stock
    const safetyStockMonths = 2;
    const reorderPoint = amc * 1; // 1 month safety stock
    const maxStock = amc * 3; // 3 months max stock
    
    let suggestedQty = (amc * safetyStockMonths) - stockQty;
    if (suggestedQty < 0) suggestedQty = 0;

    return {
      icode: String(row['icode'] ?? ''),
      name: String(row['drug_name'] ?? 'Unknown'),
      unit: String(row['unit'] ?? ''),
      stockQty: stockQty,
      amc: amc,
      suggestedQty: Math.ceil(suggestedQty),
      reorderPoint: Math.ceil(reorderPoint),
      maxStock: Math.ceil(maxStock),
    };
  });
}
