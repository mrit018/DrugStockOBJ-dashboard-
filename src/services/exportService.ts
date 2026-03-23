// =============================================================================
// BMS Session KPI Dashboard - Export Service
// Handles sending report data to external endpoints like Google App Script.
// =============================================================================

export interface ExportReportPayload {
  hospitalCode: string;
  hospitalName: string;
  reportName: string;
  reportDate: string;
  data: any[];
  timestamp: string;
}

/**
 * Sends report data to a Google App Script Web App URL.
 * @param url The Google App Script Web App URL
 * @param payload The report data payload
 */
export async function sendToGoogleAppScript(url: string, payload: ExportReportPayload): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'no-cors', // Standard for GAS Web Apps to avoid CORS issues
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // Note: With 'no-cors', we can't check response.ok, but if no error is thrown, we assume success.
    return true;
  } catch (error) {
    console.error('Failed to send data to Google App Script:', error);
    throw error;
  }
}
