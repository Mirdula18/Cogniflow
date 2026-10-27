import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UploadDropzone, validateUpload } from "@/components/dataset/UploadDropzone";

describe("UploadDropzone", () => {
  it("shows the dragging state and returns to idle when the drag leaves", () => {
    render(<UploadDropzone onUpload={vi.fn()} mockMode />);
    const zone = screen.getByText("Upload a file").closest("label");
    if (!zone) throw new Error("dropzone label missing");
    fireEvent.dragOver(zone);
    expect(zone).toHaveAttribute("data-state", "dragging");
    expect(screen.getByText("Drop the file to upload")).toBeInTheDocument();
    fireEvent.dragLeave(zone);
    expect(zone).toHaveAttribute("data-state", "idle");
  });

  it("validates extension case-insensitively and size", () => {
    expect(validateUpload(new File(["x"], "Report.XLSX"))).toBeUndefined();
    expect(validateUpload(new File(["x"], "report.xls"))).toMatch(/Only .csv and .xlsx/);
  });

  it("reports the adapter's error message", async () => {
    render(<UploadDropzone onUpload={() => Promise.reject(new Error("Server said no"))} mockMode={false} />);
    fireEvent.change(screen.getByLabelText(/Upload a file/), { target: { files: [new File(["a"], "a.csv")] } });
    expect(await screen.findByText("Error: Server said no")).toBeInTheDocument();
  });
});
