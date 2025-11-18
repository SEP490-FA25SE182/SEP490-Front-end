import axios from "axios";
import { API_BASE_URL } from "@/config";

export const GhnAddressService = {
  async getProvinces() {
    const res = await axios.get(`${API_BASE_URL}/shipping/provinces`);
    return res.data || [];
  },

  async getDistricts(provinceId: number) {
    const res = await axios.get(
      `${API_BASE_URL}/shipping/districts?provinceId=${provinceId}`
    );
    return res.data || [];
  },

  async getWards(districtId: number) {
    const res = await axios.get(
      `${API_BASE_URL}/shipping/wards?districtId=${districtId}`
    );
    return res.data || [];
  },

  async calculateShippingFee(payload: any) {
  const res = await axios.post(`${API_BASE_URL}/shipping/calculate-fee`, payload);
  return res.data;
},
};



