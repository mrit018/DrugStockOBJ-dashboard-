// =============================================================================
// BMS Session KPI Dashboard - Pharmacy Analytics Page
// (Drug Stock Usage Report & Procurement Planning)
// =============================================================================

import { useState, useMemo } from 'react';
import { useBmsSessionContext } from '@/contexts/BmsSessionContext';
import { useQuery } from '@/hooks/useQuery';
import { getDrugUsageReport, getProcurementPlanning } from '@/services/pharmacyService';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { DrugUsageChart } from '@/components/charts/DrugUsageChart';
import { Pill, BarChart3, ClipboardList, AlertCircle, FileSpreadsheet, FileText, Download, Share2, CloudUpload } from 'lucide-react';
import { getDateRange, formatDateISO } from '@/utils/dateUtils';
import { exportToExcel, exportToPdf } from '@/utils/exportUtils';
import { sendToGoogleAppScript } from '@/services/exportService';

// Placeholder for Google App Script Web App URL - replace with actual URL
const GOOGLE_APP_SCRIPT_URL = 'YOUR_GOOGLE_APP_SCRIPT_WEB_APP_URL_HERE';

export default function PharmacyAnalytics() {
  const { session, connectionConfig } = useBmsSessionContext();
  const [isSending, setIsSending] = useState(false);
  
  // Default to last 30 days for usage report
  const initialRange = getDateRange(30);
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);

  // 1. Drug Usage Report Query
  const usageQueryFn = useMemo(() => {
    if (!connectionConfig || !session) return null;
    return () => getDrugUsageReport(connectionConfig, session.databaseType, startDate, endDate);
  }, [connectionConfig, session, startDate, endDate]);

  const { data: usageReport, isLoading: isLoadingUsage } = useQuery({
    queryFn: usageQueryFn || (async () => []),
    enabled: !!usageQueryFn,
  });

  // 2. Procurement Planning Query
  const procurementQueryFn = useMemo(() => {
    if (!connectionConfig || !session) return null;
    return () => getProcurementPlanning(connectionConfig, session.databaseType);
  }, [connectionConfig, session]);

  const { data: procurementPlan, isLoading: isLoadingProcurement } = useQuery({
    queryFn: procurementQueryFn || (async () => []),
    enabled: !!procurementQueryFn,
  });

  const handleRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  // ---------------------------------------------------------------------------
  // Export Handlers
  // ---------------------------------------------------------------------------

  const handleExportUsageExcel = () => {
    if (!usageReport || usageReport.length === 0) return;
    
    const exportData = usageReport.map(item => ({
      'รหัสยา': item.icode,
      'ชื่อยา': item.name,
      'หน่วย': item.unit,
      'จำนวนใช้รวม': item.totalQty,
      'มูลค่ารวม (บาท)': item.totalCost
    }));
    
    exportToExcel(exportData, `รายงานการใช้ยา_${startDate}_ถึง_${endDate}`, 'Drug Usage');
  };

  const handleExportUsagePdf = () => {
    if (!usageReport || usageReport.length === 0) return;
    
    const columns = [
      { header: 'icode', dataKey: 'icode' },
      { header: 'Name', dataKey: 'name' },
      { header: 'Unit', dataKey: 'unit' },
      { header: 'Qty', dataKey: 'totalQty' },
      { header: 'Cost', dataKey: 'totalCost' }
    ];
    
    exportToPdf(`Drug Usage Report (${startDate} to ${endDate})`, columns, usageReport, `DrugUsage_${startDate}_to_${endDate}`);
  };

  const handleExportProcurementExcel = () => {
    if (!procurementPlan || procurementPlan.length === 0) return;
    
    const exportData = procurementPlan.map(item => ({
      'รหัสยา': item.icode,
      'ชื่อยา': item.name,
      'หน่วย': item.unit,
      'คงคลัง': item.stockQty,
      'ยอดใช้เฉลี่ย/เดือน (AMC)': item.amc,
      'จุดสั่งซื้อ (Min)': item.reorderPoint,
      'ระดับสูง (Max)': item.maxStock,
      'จำนวนสั่งเพิ่ม': item.suggestedQty
    }));
    
    exportToExcel(exportData, `แผนสั่งซื้อยา_${formatDateISO(new Date())}`, 'Procurement Plan');
  };

  const handleExportProcurementPdf = () => {
    if (!procurementPlan || procurementPlan.length === 0) return;
    
    const columns = [
      { header: 'Name', dataKey: 'name' },
      { header: 'Stock', dataKey: 'stockQty' },
      { header: 'AMC', dataKey: 'amc' },
      { header: 'Min', dataKey: 'reorderPoint' },
      { header: 'Max', dataKey: 'maxStock' },
      { header: 'Order', dataKey: 'suggestedQty' }
    ];
    
    exportToPdf(`Procurement Planning Report`, columns, procurementPlan, `ProcurementPlan_${formatDateISO(new Date())}`);
  };

  const handleSendToGoogle = async (reportName: string, data: any[]) => {
    if (!session || !data || data.length === 0) return;
    
    setIsSending(true);
    try {
      const payload = {
        hospitalCode: session.userInfo.hospitalCode,
        hospitalName: 'องค์การบริหารส่วนจังหวัดกาญจนบุรี', // Could also come from systemInfo if available
        reportName,
        reportDate: reportName.includes('การใช้ยา') ? `${startDate} ถึง ${endDate}` : formatDateISO(new Date()),
        data,
        timestamp: new Date().toISOString()
      };
      
      await sendToGoogleAppScript(GOOGLE_APP_SCRIPT_URL, payload);
      alert('ส่งข้อมูลไปยัง Google Sheet สำเร็จ');
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการส่งข้อมูล: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsSending(false);
    }
  };

  if (!session) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 shadow-sm border border-blue-100/50">
            <Pill className="h-5.5 w-5.5" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">คลังยาและเวชภัณฑ์</h2>
        </div>
        <p className="text-sm font-medium text-slate-500/80">ระบบวิเคราะห์การใช้ยาและวางแผนประมาณการสั่งซื้ออัตโนมัติ</p>
      </div>

      <Tabs defaultValue="usage" className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <TabsList className="bg-slate-100/80 p-1 border border-slate-200/50 shadow-sm">
            <TabsTrigger value="usage" className="flex items-center gap-2 px-4">
              <BarChart3 className="h-4 w-4" />
              รายงานการใช้ยา
            </TabsTrigger>
            <TabsTrigger value="procurement" className="flex items-center gap-2 px-4">
              <ClipboardList className="h-4 w-4" />
              ประมาณการสั่งซื้อ
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center">
             <div className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-md border border-slate-200/50 mr-3">
               BMS HOSxP INTELLIGENCE
             </div>
          </div>
        </div>

        {/* Tab 1: Usage Report */}
        <TabsContent value="usage" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <DrugUsageChart data={usageReport || []} isLoading={isLoadingUsage} className="h-full border-slate-200/60 shadow-md shadow-slate-200/20" />
            </div>
            
            <div className="lg:col-span-2">
              <Card className="border-slate-200/60 shadow-md shadow-slate-200/20 overflow-hidden h-full">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between space-y-0 pb-6 gap-4 border-b border-slate-50">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold text-slate-800">สรุปปริมาณการใช้ยา</CardTitle>
                    <p className="text-xs text-slate-500 font-medium italic">แสดงข้อมูลการเบิกจ่ายยาตามช่วงวันที่เลือก (Top 100)</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <DateRangePicker 
                      startDate={startDate} 
                      endDate={endDate} 
                      onRangeChange={handleRangeChange} 
                      isLoading={isLoadingUsage}
                    />
                    <div className="flex items-center gap-1.5 ml-2">
                      <button
                        onClick={() => handleSendToGoogle('รายงานการใช้ยา', usageReport || [])}
                        disabled={isLoadingUsage || isSending || !usageReport?.length}
                        className="flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-50"
                        title="Send to Google Sheet"
                      >
                        <CloudUpload className="h-4 w-4" />
                        {isSending ? 'กำลังส่ง...' : 'ส่ง Google'}
                      </button>
                      <button
                        onClick={handleExportUsageExcel}
                        disabled={isLoadingUsage || isSending || !usageReport?.length}
                        className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                        title="Export to Excel"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        Excel
                      </button>
                      <button
                        onClick={handleExportUsagePdf}
                        disabled={isLoadingUsage || isSending || !usageReport?.length}
                        className="flex items-center gap-1.5 rounded-md bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors disabled:opacity-50"
                        title="Export to PDF"
                      >
                        <FileText className="h-4 w-4" />
                        PDF
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoadingUsage ? (
                    <div className="flex h-80 items-center justify-center bg-slate-50/30">
                      <LoadingSpinner size="lg" message="กำลังวิเคราะห์ข้อมูลการใช้ยา..." />
                    </div>
                  ) : usageReport && usageReport.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-slate-50/80">
                          <TableRow className="hover:bg-transparent border-b border-slate-100">
                            <TableHead className="w-[100px] py-4">รหัสยา</TableHead>
                            <TableHead className="min-w-[200px]">ชื่อเวชภัณฑ์</TableHead>
                            <TableHead className="text-right">จำนวนใช้</TableHead>
                            <TableHead className="text-right font-semibold text-blue-700">มูลค่า (บาท)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {usageReport.map((item) => (
                            <TableRow key={item.icode} className="hover:bg-blue-50/30 transition-colors border-b border-slate-50/80">
                              <TableCell className="font-mono text-[10px] text-slate-500">{item.icode}</TableCell>
                              <TableCell className="py-3">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-800 text-sm">{item.name}</span>
                                  <span className="text-[10px] text-slate-400">{item.unit}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-bold text-slate-700">{item.totalQty.toLocaleString()}</TableCell>
                              <TableCell className="text-right font-bold text-blue-600">
                                {item.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="py-20">
                      <EmptyState title="ไม่พบประวัติการใช้ยาในช่วงเวลานี้" description="กรุณาลองระบุช่วงวันที่อื่น หรือตรวจสอบการเชื่อมต่อฐานข้อมูล" icon={<Pill className="h-6 w-6" />} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Procurement Planning */}
        <TabsContent value="procurement" className="space-y-4 outline-none">
          <Card className="border-slate-200/60 shadow-md shadow-slate-200/20 overflow-hidden">
            <CardHeader className="border-b border-slate-50 bg-slate-50/30 pb-6">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <CardTitle className="text-lg font-bold text-slate-800">แผนประมาณการสั่งซื้อยา (Procurement Planning)</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-2 w-2 rounded-full bg-blue-500" />
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">คำนวณจากยอดใช้เฉลี่ย 3 เดือนล่าสุด (AMC)</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="hidden md:flex flex-col text-right mr-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Inventory Policy</div>
                    <div className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">SAFETY STOCK: 2 MONTHS</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleSendToGoogle('แผนประมาณการสั่งซื้อยา', procurementPlan || [])}
                      disabled={isLoadingProcurement || isSending || !procurementPlan?.length}
                      className="flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-50"
                      title="Send to Google Sheet"
                    >
                      <CloudUpload className="h-4 w-4" />
                      {isSending ? 'กำลังส่ง...' : 'ส่ง Google'}
                    </button>
                    <button
                      onClick={handleExportProcurementExcel}
                      disabled={isLoadingProcurement || isSending || !procurementPlan?.length}
                      className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                      title="Export to Excel"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      Excel
                    </button>
                    <button
                      onClick={handleExportProcurementPdf}
                      disabled={isLoadingProcurement || isSending || !procurementPlan?.length}
                      className="flex items-center gap-1.5 rounded-md bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors disabled:opacity-50"
                      title="Export to PDF"
                    >
                      <FileText className="h-4 w-4" />
                      PDF
                    </button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingProcurement ? (
                <div className="flex h-80 items-center justify-center bg-slate-50/30">
                  <LoadingSpinner size="lg" message="กำลังคำนวณแผนการสั่งซื้อ..." />
                </div>
              ) : procurementPlan && procurementPlan.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow className="hover:bg-transparent border-b border-slate-100">
                        <TableHead className="py-4">รายการยา / เวชภัณฑ์</TableHead>
                        <TableHead className="text-right">คงคลัง</TableHead>
                        <TableHead className="text-right">AMC (เฉลี่ย)</TableHead>
                        <TableHead className="text-right">Min (จุดสั่งซื้อ)</TableHead>
                        <TableHead className="text-right">Max (ระดับสูง)</TableHead>
                        <TableHead className="text-right w-[180px]">สถานะ / ข้อแนะนำ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {procurementPlan.map((item) => (
                        <TableRow key={item.icode} className="hover:bg-blue-50/30 transition-colors border-b border-slate-50/80">
                          <TableCell className="py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-slate-800 leading-tight">{item.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono font-semibold tracking-wider">{item.icode}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-700">
                            {item.stockQty.toLocaleString()} <span className="text-[10px] font-medium text-slate-400 ml-0.5">{item.unit}</span>
                          </TableCell>
                          <TableCell className="text-right font-bold text-indigo-600/80">
                            {item.amc.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-amber-600 bg-amber-50/30">{item.reorderPoint.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-semibold text-emerald-600">{item.maxStock.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            {item.suggestedQty > 0 ? (
                              <div className="flex flex-col items-end gap-1">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-bold text-blue-800 ring-1 ring-inset ring-blue-700/10">
                                  <AlertCircle className="h-3 w-3" />
                                  สั่งเพิ่ม {item.suggestedQty.toLocaleString()}
                                </span>
                                {item.amc > 0 && (
                                  <span className="text-[10px] font-bold text-blue-500/70 mr-1 italic">
                                    {(item.suggestedQty / item.amc).toFixed(1)} เดือนการใช้งาน
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-inset ring-slate-400/10">
                                ยาเพียงพอ
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-20">
                  <EmptyState title="ไม่พบข้อมูลสำหรับการวางแผน" description="ตรวจสอบข้อมูล drugitems และการเคลื่อนไหวใน HOSxP" icon={<AlertCircle className="h-6 w-6" />} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
