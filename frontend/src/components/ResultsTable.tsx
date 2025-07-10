import React from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface WalletResult {
  address: string;
  balance: number | null;
}

interface TxResult {
  transactionHash: string;
  details: any;
}

interface ResultsTableProps {
  fileName: string;
  data: WalletResult[] | TxResult[];
}

const ResultsTable: React.FC<ResultsTableProps> = ({ fileName, data }) => {
  if (!data || data.length === 0) return null;
  const isWallet = Object.prototype.hasOwnProperty.call(data[0], "address");

  const handleDownload = (format: "csv" | "txt") => {
    let content = "";
    if (format === "csv") {
      const header = isWallet ? "address,balance" : "transactionHash,details";
      const rows = (data as any[]).map((row) =>
        isWallet
          ? `${row.address},${row.balance ?? ""}`
          : `${row.transactionHash},${JSON.stringify(row.details)}`
      );
      content = [header, ...rows].join("\n");
    } else {
      const rows = (data as any[]).map((row) =>
        isWallet ? row.address : row.transactionHash
      );
      content = rows.join("\n");
    }
    const blob = new Blob([content], {
      type: format === "csv" ? "text/csv" : "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = format === "csv" ? "results.csv" : "results.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-4">
      <p className="font-semibold mb-2">Results for {fileName}:</p>
      <Table>
        <TableHeader>
          <TableRow>
            {isWallet ? (
              <>
                <TableHead>Address</TableHead>
                <TableHead>Balance</TableHead>
              </>
            ) : (
              <>
                <TableHead>Transaction Hash</TableHead>
                <TableHead>Details</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data as any[]).map((row, idx) => (
            <TableRow key={idx}>
              {isWallet ? (
                <>
                  <TableCell className="font-mono break-all">{row.address}</TableCell>
                  <TableCell>{row.balance ?? ""}</TableCell>
                </>
              ) : (
                <>
                  <TableCell className="font-mono break-all">
                    {row.transactionHash}
                  </TableCell>
                  <TableCell className="break-all text-xs">
                    {JSON.stringify(row.details)}
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.length > 5 && (
        <div className="mt-2 text-sm">
          <span className="mr-2">Download full results:</span>
          <Button variant="link" className="px-1" onClick={() => handleDownload("csv")}>CSV</Button>
          <Button variant="link" className="px-1" onClick={() => handleDownload("txt")}>TXT</Button>
        </div>
      )}
    </div>
  );
};

export default ResultsTable;
