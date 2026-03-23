from flask import Blueprint, request, jsonify
import os
import logging
import sys
import re

logger = logging.getLogger(__name__)

bp = Blueprint('push_notification', __name__, url_prefix='/api')

import requests

OLLAMA_ENDPOINT = "http://127.0.0.1:11434/api/chat"
OLLAMA_MODEL = "mistral"
OLLAMA_AVAILABLE = True

logger.info(f"✅ Ollama API configured: {OLLAMA_ENDPOINT}")

def generate_mock_callouts(product_name: str, category: str, notification_type: str) -> list:
    """Generate mock callouts for demo purposes when OpenAI is not available"""
    import random
    
    urgent_templates = [
        f"🔴 Flash sale on {product_name}! Lowest price of the year—limited time only.",
        f"⚡ {product_name} is selling out fast. Grab yours before we run out!",
        f"🚨 {product_name} deal ends in 2 hours. Don't miss out!",
        f"⏰ Last chance: {product_name} at its best price. Ends soon!",
        f"💥 {product_name} on mega discount today only. Act fast!",
    ]
    
    playful_templates = [
        f"✨ Psst... {product_name} just got an amazing price! Your wallet will thank you.",
        f"🎉 {product_name}? Yes, please! And at this price? Even better.",
        f"💎 Treat yourself: {product_name} is now at an unbeatable price.",
        f"🛍️ {product_name} called—it said you deserve it at this price.",
        f"🌟 Found something you'll love: {product_name} is now a steal!",
    ]
    
    templates = urgent_templates if notification_type == 'Urgent' else playful_templates
    return random.sample(templates, min(3, len(templates)))


def generate_ai_callouts(product_name: str, category: str, notification_type: str) -> list:
    """Generate callouts using Ollama API (local)"""
    
    tone = 'urgent and time-sensitive' if notification_type == 'Urgent' else 'playful and engaging'
    
    prompt = f"""Generate 3 DIFFERENT push notification callouts for an e-commerce product. Each should be unique and creative.
    
Product Name: {product_name}
Product Category: {category}
Notification Tone: {tone}

Constraints:
- Maximum 100 characters per callout
- Include 1-2 relevant emojis
- Each callout MUST be completely different from the others
- Be creative and avoid repeating structures
- Sound natural and conversational

Format: Return only 3 callouts, one per line, no numbering or labels.

"""  
    try:
        print(f"\n[Ollama] Requesting {notification_type} callouts for '{product_name}'", flush=True)
        
        response = requests.post(
            OLLAMA_ENDPOINT,
            json={
                "model": OLLAMA_MODEL,
                "messages": [
                    {"role": "system", "content": "You are a creative e-commerce marketing expert who writes compelling, diverse push notifications. Each message should be unique and different from others."},
                    {"role": "user", "content": prompt}
                ],
                "stream": False,
                "temperature": 0.9
            },
            timeout=30
        )
        
        response.raise_for_status()
        result = response.json()
        content = result.get("message", {}).get("content", "").strip()
        
        print(f"[Ollama] Raw response:\n{content}\n", flush=True)
        
        raw_lines = [line.strip() for line in content.split('\n') if line.strip()]
        callouts = []
        for line in raw_lines:
            cleaned = re.sub(r'^\s*\d+[\s\.:-]*', '', line)  # remove numbering prefixes
            cleaned = cleaned.strip().strip('"').strip("'")
            if cleaned and len(cleaned) > 10:
                callouts.append(cleaned)

        print(f"[Ollama] Parsed {len(callouts)} callouts", flush=True)
        
        # Filter to exactly 3 callouts
        result_callouts = callouts[:3] if callouts else generate_mock_callouts(product_name, category, notification_type)
        print(f"[Ollama] Returning {len(result_callouts)} callouts\n", flush=True)
        return result_callouts
    
    except Exception as e:
        error_msg = f"[Ollama] API error: {str(e)}"
        logger.error(error_msg)
        print(error_msg, flush=True)
        # Fallback to mock if API fails
        return generate_mock_callouts(product_name, category, notification_type)


@bp.route('/generate-callouts', methods=['POST'])
def generate_callouts():
    """Generate push notification callouts"""
    print("\n" + "="*80, flush=True)
    print("✅ ENDPOINT CALLED: POST /api/generate-callouts", flush=True)
    print("="*80, flush=True)
    
    try:
        data = request.get_json()
        print(f"📥 Request payload: {data}", flush=True)
        
        # Validate required fields
        required_fields = ['sku', 'productName', 'category', 'type']
        if not all(field in data for field in required_fields):
            print(f"❌ Validation failed: Missing required fields", flush=True)
            return jsonify({'error': 'Missing required fields'}), 400
        
        product_name = data.get('productName', 'Product')
        category = data.get('category', 'General')
        notification_type = data.get('type', 'Urgent')
        
        print(f"\n🎯 Generating {notification_type} callouts", flush=True)
        print(f"   Product: {product_name}", flush=True)
        print(f"   Category: {category}", flush=True)
        print(f"   OLLAMA_AVAILABLE: {OLLAMA_AVAILABLE}\n", flush=True)
        
        # Generate callouts
        if OLLAMA_AVAILABLE:
            print("🤖 Calling Ollama API...", flush=True)
            callout_texts = generate_ai_callouts(product_name, category, notification_type)
            print("✨ Ollama callouts generated", flush=True)
        else:
            print("📋 Using mock callouts...", flush=True)
            callout_texts = generate_mock_callouts(product_name, category, notification_type)
            print("✨ Mock callouts generated", flush=True)
        
        # Format response
        callouts = [
            {"id": idx, "text": text}
            for idx, text in enumerate(callout_texts)
        ]
        
        print(f"\n📤 Returning {len(callouts)} callouts:")
        for i, c in enumerate(callouts, 1):
            print(f"   {i}. {c['text']}", flush=True)
        print("="*80 + "\n", flush=True)
        
        return jsonify({'callouts': callouts}), 200
    
    except Exception as e:
        error_msg = f"❌ ERROR in endpoint: {str(e)}"
        print(f"\n{error_msg}", flush=True)
        print("Traceback:", flush=True)
        import traceback
        traceback.print_exc()
        print("="*80 + "\n", flush=True)
        logger.error(f"Error generating callouts: {str(e)}")
        return jsonify({'error': 'Failed to generate callouts'}), 500
