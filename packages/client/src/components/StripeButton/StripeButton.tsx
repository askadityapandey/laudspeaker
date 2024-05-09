import * as React from 'react';

  function StripeButton() {
    // Paste the stripe-buy-button snippet in your React component
    return (
      <stripe-buy-button
      buy-button-id="buy_btn_1PDdF5LClnYN2KJM2ryR32A8"  
      //buy-button-id="'{{buy_btn_1PDdF5LClnYN2KJM2ryR32A8}}'"
        publishable-key="pk_live_51MbAQbLClnYN2KJMwHOBKedGPQFtEoYtCIUPo8Gxdy9camSY4Zbs8YG6kqOVGQC3IwL0zeqWJWC8TGHtdi5eGs8m0054XWOGU3"
      >
      </stripe-buy-button>
    );
  }
  
  export default StripeButton;