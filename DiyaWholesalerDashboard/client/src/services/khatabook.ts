import api from "@/lib/axios";

export async function fetchKhatabookSummary() {
  const res = await api.get("/ledger/wholesaler/summary");
  return res.data;
}

export async function fetchKhatabookRetailers() {
  const res = await api.get("/ledger/wholesaler/retailers");
  return res.data.map((r: any) => {
    const name = r.shopName || r.retailerName || "Retailer";

    const initials = name
      .split(" ")
      .map((w: string) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    const outstanding = Math.max(0, Number(r.totalDue ?? 0));
    const overdueDays = Number(r.overdueDays ?? 0);

    let status: string;
    if (outstanding <= 0) {
      status = "Settled";
    } else if (overdueDays > 7) {
      status = "Critical";
    } else if (overdueDays > 0) {
      status = "Pending";
    } else {
      status = "Due";
    }

    return {
      id: r.retailerId,
      name: name,
      location: "",
      outstanding,
      due: `₹${Number(r.totalDue || 0).toLocaleString("en-IN")}`,
      overdue: `₹${Number(r.overdueAmount || 0).toLocaleString("en-IN")}`,
      lastPayment: r.lastPaymentDate
        ? new Date(r.lastPaymentDate).toLocaleDateString("en-IN")
        : "No payment",
      status,
      initials,
    };
  });
}

export async function fetchRetailerStatement(retailerId: string) {
  const res = await api.get(`/ledger/wholesaler/retailer/${retailerId}/statement`);
  return res.data;
}
