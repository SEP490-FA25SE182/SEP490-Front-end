import axios from "axios";
import { API_RK } from "@/config";

export const GhnAddressService = {
  async getProvinces() {
    const res = await axios.get(`${API_RK}/shipping/provinces`);
    return res.data || [];
  },

  async getDistricts(provinceId: number) {
    const res = await axios.get(
      `${API_RK}/shipping/districts?provinceId=${provinceId}`
    );
    return res.data || [];
  },

  async getWards(districtId: number) {
    const res = await axios.get(
      `${API_RK}/shipping/wards?districtId=${districtId}`
    );
    return res.data || [];
  },

  async calculateShippingFee(payload: any) {
  const res = await axios.post(`${API_RK}/shipping/calculate-fee`, payload);
  return res.data;
},
};



