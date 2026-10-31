import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ExcelExportService } from "@/lib/services/excel-export-service";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "غير مصرح لك بتصدير البيانات" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const caseType = searchParams.get("caseType") as "request" | "complaint" | undefined;
    const search = searchParams.get("search") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;
    const status = searchParams.get("status") || undefined;

    const buffer = await ExcelExportService.generateWorkbook({
      caseType: caseType || undefined,
      search,
      categoryId,
      status,
    });

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `HR_${caseType || "All"}_Export_${dateStr}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error: any) {
    console.error("Excel export failed:", error);
    return NextResponse.json(
      { error: error.message || "فشل تصدير ملف Excel" },
      { status: 500 }
    );
  }
}
