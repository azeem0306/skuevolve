import React, { useState, useCallback } from 'react';
import { X, Copy, Check } from 'lucide-react';
import './PushNotificationOverlay.css';

const PushNotificationOverlay = ({ isOpen, onClose, selectedSku, products }) => {
  const [notificationType, setNotificationType] = useState('Urgent');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Get product details
  const productData = selectedSku
    ? products.find((p) => p.skuId === selectedSku)
    : null;
  const productName = productData?.name || 'Select Product';
  const category = productData?.category || 'Unknown';

  // Generate callouts using AI
  const generateCallouts = useCallback(async () => {
    if (!selectedSku || !productName) {
      alert('Please select a product first');
      return;
    }

    console.log('🚀 Starting callout generation...');
    console.log('Product:', { selectedSku, productName, category, notificationType });

    setIsLoading(true);
    try {
      // Call backend API (running on port 5000)
      const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      console.log('📡 API URL:', backendUrl);
      
      const requestPayload = {
        sku: selectedSku,
        productName: productName,
        category: category,
        type: notificationType,
      };
      console.log('📤 Request body:', requestPayload);
      
      const response = await fetch(`${backendUrl}/api/generate-callouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      console.log('✅ API Response status:', response.status);
      
      if (!response.ok) throw new Error('Failed to generate callouts');

      const data = await response.json();
      console.log('📨 Backend response:', JSON.stringify(data, null, 2));
      console.log('🎯 Callouts received:', data.callouts);
      
      setSuggestions(data.callouts || []);
      setSelectedSuggestion(null);
      setCopiedId(null);
    } catch (error) {
      console.error('❌ Error generating callouts:', error);
      // Fallback: Generate mock callouts for demo
      console.log('⚠️  Using MOCK callouts instead');
      const mockCallouts = generateMockCallouts(productName, notificationType);
      console.log('📋 Mock callouts:', mockCallouts);
      setSuggestions(mockCallouts);
      setSelectedSuggestion(null);
      setCopiedId(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSku, productName, category, notificationType]);

  // Mock callout generator (for demo purposes)
  const generateMockCallouts = (name, type) => {
    const urgentTemplates = [
      `🔴 Flash sale on ${name}! Lowest price of the year—limited time only.`,
      `⚡ ${name} is selling out fast. Grab yours before we run out!`,
      `🚨 ${name} deal ends in 2 hours. Don't miss out!`,
      `⏰ Last chance: ${name} at its best price. Ends soon!`,
      `💥 ${name} on mega discount today only. Act fast!`,
    ];
    
    const playfulTemplates = [
      `✨ Psst... ${name} just got an amazing price! Your wallet will thank you.`,
      `🎉 ${name}? Yes, please! And at this price? Even better.`,
      `💎 Treat yourself: ${name} is now at an unbeatable price.`,
      `🛍️ ${name} called—it said you deserve it at this price.`,
      `⭐ Found something you'll love: ${name} is now a steal!`,
    ];
    
    const templates = type === 'Urgent' ? urgentTemplates : playfulTemplates;
    // Return 3 random unique suggestions
    const shuffled = [...templates].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3).map((text, idx) => ({
      id: idx,
      text: text,
    }));
  };

  // Copy callout to clipboard
  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="pno-overlay" onClick={onClose}>
      <div className="pno-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header with close button */}
        <div className="pno-header">
          <h2 className="pno-title">Create Push Notification</h2>
          <button
            className="pno-close-btn"
            onClick={onClose}
            aria-label="Close overlay"
          >
            <X size={24} />
          </button>
        </div>

        <div className="pno-content">
          {/* Left Panel */}
          <div className="pno-left-panel">
            {/* Product Selection */}
            <div className="pno-section">
              <label className="pno-section-label">SELECTED PRODUCT</label>
              <div className="pno-product-selector">
                <div className="pno-product-display">
                  <div className="pno-product-placeholder" />
                  <div className="pno-product-info">
                    <div className="pno-product-name">{productName}</div>
                    <div className="pno-product-category">{category}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Type Selector */}
            <div className="pno-section">
              <label className="pno-section-label">TYPE</label>
              <div className="pno-type-buttons">
                <button
                  type="button"
                  className={`pno-type-btn ${
                    notificationType === 'Urgent' ? 'pno-type-btn--active' : ''
                  }`}
                  aria-pressed={notificationType === 'Urgent'}
                  onClick={() => setNotificationType('Urgent')}
                >
                  Urgent
                </button>
                <button
                  type="button"
                  className={`pno-type-btn ${
                    notificationType === 'Playful' ? 'pno-type-btn--active' : ''
                  }`}
                  aria-pressed={notificationType === 'Playful'}
                  onClick={() => setNotificationType('Playful')}
                >
                  Playful
                </button>
              </div>
            </div>

            {/* AI Suggestions */}
            <div className="pno-section">
              <label className="pno-section-label">AI SUGGESTIONS</label>
              <div className="pno-suggestions-list">
                {suggestions.length === 0 ? (
                  <div className="pno-suggestions-empty">
                    <p>No suggestions yet. Click "Generate New" to create callouts.</p>
                  </div>
                ) : (
                  suggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      className={`pno-suggestion-item ${
                        selectedSuggestion?.id === suggestion.id
                          ? 'pno-suggestion-item--selected'
                          : ''
                      }`}
                      onClick={() => setSelectedSuggestion(suggestion)}
                    >
                      <div className="pno-suggestion-text">{suggestion.text}</div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pno-actions">
              <button
                className="pno-btn pno-btn--generate"
                onClick={generateCallouts}
                disabled={isLoading}
              >
                {isLoading ? '⏳ Generating…' : '✨ Generate New'}
              </button>
              <button
                className={`pno-btn pno-btn--copy ${
                  selectedSuggestion ? 'pno-btn--copy--active' : ''
                }`}
                onClick={() => {
                  if (selectedSuggestion) {
                    copyToClipboard(selectedSuggestion.text);
                  }
                }}
                disabled={!selectedSuggestion}
              >
                {copiedId === selectedSuggestion?.text ? (
                  <>
                    <Check size={16} />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Panel - iPhone Preview */}
          <div className="pno-right-panel">
            <div className="pno-iphone-frame">
              <div className="pno-iphone-notch" />
              <div className="pno-iphone-screen">
                {selectedSuggestion ? (
                  <div className="pno-lock-screen-preview">
                    <div className="pno-preview-time">10:02</div>
                    <div className="pno-notification-popup">
                      <div className="pno-notification-title">Flash Alert</div>
                      <div className="pno-notification-body">
                        {selectedSuggestion.text}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pno-preview-empty">
                    <p>Select a callout to preview</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PushNotificationOverlay;
