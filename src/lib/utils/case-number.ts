import { format } from "date-fns";

export function generateCaseNumber(
  courtCode: string,
  caseType: string,
  filingDate: Date,
  sequence: number,
): string {
  const typeCode: Record<string, string> = {
    CRIMINAL: "CR",
    CIVIL: "CV",
    FAMILY: "FM",
    LAND: "LD",
    COMMERCIAL: "CM",
    ANTI_CORRUPTION: "AC",
  };
  const year = format(filingDate, "yyyy");
  const seq = String(sequence).padStart(3, "0");
  const tc = typeCode[caseType] || "XX";
  return `${courtCode}-${tc}-${seq}/${year}`;
}

export async function getNextSequence(courtCode: string, year: string): Promise<number> {
  const { prisma } = await import("@/lib/prisma/client");
  const lastCase = await prisma.case.findFirst({
    where: {
      court: { code: courtCode },
      filingDate: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) },
    },
    orderBy: { caseNumber: "desc" },
    select: { caseNumber: true },
  });
  if (!lastCase) return 1;
  const parts = lastCase.caseNumber.split("/");
  const seqPart = parts[0]?.split("-").pop();
  return (parseInt(seqPart || "0", 10) || 0) + 1;
}
