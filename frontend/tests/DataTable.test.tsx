import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DataTable, Column } from "../src/components/common/DataTable";

interface SampleItem {
  id: string;
  name: string;
  severity: string;
  count: number;
}

describe("DataTable Primitive Component", () => {
  const columns: Column<SampleItem>[] = [
    { key: "name", header: "Finding Name" },
    { key: "severity", header: "Severity", align: "center" },
    { key: "count", header: "Occurrences", align: "right" },
  ];

  const mockData: SampleItem[] = [
    { id: "f-1", name: "SQL Injection", severity: "CRITICAL", count: 2 },
    { id: "f-2", name: "Insecure Deserialization", severity: "HIGH", count: 5 },
  ];

  it("renders table with correct headers and data rows", () => {
    render(
      <DataTable
        columns={columns}
        data={mockData}
        keyExtractor={(item) => item.id}
      />
    );

    expect(screen.getByRole("columnheader", { name: "Finding Name" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Severity" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Occurrences" })).toBeInTheDocument();

    expect(screen.getByText("SQL Injection")).toBeInTheDocument();
    expect(screen.getByText("Insecure Deserialization")).toBeInTheDocument();
  });

  it("handles row clicks when onRowClick is provided", () => {
    const handleRowClick = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={mockData}
        keyExtractor={(item) => item.id}
        onRowClick={handleRowClick}
      />
    );

    fireEvent.click(screen.getByText("SQL Injection"));
    expect(handleRowClick).toHaveBeenCalledTimes(1);
    expect(handleRowClick).toHaveBeenCalledWith(mockData[0], 0);
  });

  it("displays empty state when data array is empty", () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        keyExtractor={(item) => item.id}
        emptyMessage="No security findings recorded."
      />
    );

    expect(screen.getByText("No security findings recorded.")).toBeInTheDocument();
  });

  it("renders loading indicator when isLoading is true", () => {
    render(
      <DataTable
        columns={columns}
        data={mockData}
        keyExtractor={(item) => item.id}
        isLoading={true}
      />
    );

    expect(screen.getByText("Loading data...")).toBeInTheDocument();
  });
});
