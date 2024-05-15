import * as React from 'react';

  function StripeButton() {
    
    const buyButtonId = process.env.REACT_APP_BUY_BUTTON_ID || 'default_buy_button_id';
    const publishableKey = process.env.REACT_APP_PUBLISHABLE_KEY || 'default_publishable_key';

    return (
      <stripe-buy-button
        buy-button-id={buyButtonId}
        publishable-key={publishableKey}
      >
      </stripe-buy-button>
    );
  }
  
  export default StripeButton;