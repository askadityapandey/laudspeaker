import * as React from 'react';

//test
function StripeButton() {
  // Paste the stripe-buy-button snippet in your React component
  return (
    <stripe-buy-button
    buy-button-id="buy_btn_1PEJj6LClnYN2KJMWJewO6cY"  
    //buy-button-id="'{{buy_btn_1PDdF5LClnYN2KJM2ryR32A8}}'"
      publishable-key="pk_test_51MbAQbLClnYN2KJMPj3DX4IW48ge3jh5o76im9k1UbzjkmzVMIexCjyClj5MtKkVO2KJq9mbD4DhCmbKFyLm1Ztz00RSRnYxRC"
    >
    </stripe-buy-button>
  );
}

 /*
  * live
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
  */
  
  export default StripeButton;