// src/api/client.js
// API client for communicating with backend

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const apiClient = {
  /**
   * Get all campaigns with hero products and forecasts
   */
  async getCampaigns() {
    const response = await fetch(`${API_URL}/campaigns`);
    if (!response.ok) throw new Error(`Failed to fetch campaigns: ${response.statusText}`);
    return response.json();
  },

  /**
   * Get specific campaign details
   */
  async getCampaign(campaignId) {
    const response = await fetch(`${API_URL}/campaigns/${campaignId}`);
    if (!response.ok) throw new Error(`Failed to fetch campaign: ${response.statusText}`);
    return response.json();
  },

  /**
   * Get hero products for a campaign
   */
  async getHeroProducts(campaignId) {
    const response = await fetch(`${API_URL}/campaigns/${campaignId}/hero-products`);
    if (!response.ok) throw new Error(`Failed to fetch hero products: ${response.statusText}`);
    return response.json();
  },

  /**
   * Get all inventory
   */
  async getInventory() {
    const response = await fetch(`${API_URL}/inventory`);
    if (!response.ok) throw new Error(`Failed to fetch inventory: ${response.statusText}`);
    return response.json();
  },

  /**
   * Get inventory for specific SKU
   */
  async getInventorySku(sku) {
    const response = await fetch(`${API_URL}/inventory/${sku}`);
    if (!response.ok) throw new Error(`Failed to fetch inventory for SKU: ${response.statusText}`);
    return response.json();
  },

  /**
   * Bulk lookup inventory by multiple SKUs
   */
  async bulkInventoryLookup(skus) {
    const response = await fetch(`${API_URL}/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skus })
    });
    if (!response.ok) throw new Error('Failed to lookup inventory');
    return response.json();
  },

  /**
   * Get low stock items
   */
  async getLowStockItems() {
    const response = await fetch(`${API_URL}/inventory/low-stock`);
    if (!response.ok) throw new Error('Failed to fetch low stock items');
    return response.json();
  }
};
