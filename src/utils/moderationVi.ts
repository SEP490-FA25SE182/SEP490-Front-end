export const mapRiskLevelVi = (v?: string) => {
  switch (v) {
    case "LOW":
      return "Mức rủi ro thấp";
    case "MEDIUM":
      return "Mức rủi ro trung bình";
    case "HIGH":
      return "Mức rủi ro cao";
    default:
      return v || "Không xác định";
  }
};

export const mapActionVi = (v?: string) => {
  switch (v) {
    case "APPROVE":
      return "Có thể duyệt";
    case "REVIEW":
      return "Cần xem xét";
    case "REJECT":
      return "Không được duyệt";
    default:
      return v || "Không xác định";
  }
};
