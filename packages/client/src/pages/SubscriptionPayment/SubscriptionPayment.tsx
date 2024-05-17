import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import laudspeakerLogo from "../../assets/images/laudspeaker.svg";
import ApiService from "services/api.service";
import Input from "components/Elements/Inputv2";
import Select from "components/Elements/Selectv2";
import Button, { ButtonType } from "components/Elements/Buttonv2";
import { toast } from "react-toastify";
import StripeButton from "components/StripeButton/StripeButton";
import { useInterval } from "react-use";


const SubscriptionPayment = () => {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreated, setIsCreated] = useState(false);
  const [isPaymentComplete, setIsPaymentComplete] = useState(false);
  const [name, setName] = useState("");
  const [selectedTimeZone, setSelectedTimeZone] = useState("");

  const load = async () => {
    try {
      const { data } = await ApiService.get({ url: "/accounts" });
      const { workspace } = data;

      /*
      if (workspace.id) {
        navigate("/");
      }
      */
      setLoaded(true);
    } catch (error) {
      navigate("/");
    }
  };

  // Function to initiate the creation of a Stripe Checkout session
  const handleCreateCheckoutSession = async () => {
    if(isCreated){
      return;
    }
    setIsCreating(true);

    try {
      // Call your backend to create the Stripe Checkout session
      const { data } = await ApiService.post({
        url: '/accounts/create-checkout-session'
      });
      console.log("the data is", data);
      // Redirect the user to the Stripe Checkout page
      window.location.href = data.url;
      setIsCreated(true);
    } catch (error) {
      toast.error('Failed to initiate payment: ' + (error || 'Unknown error'));
      setIsCreating(false);
    }
  };

  useEffect(() => {
    handleCreateCheckoutSession();
  }, []);

  useInterval(() => {
    load();
  }, 2000);

  useEffect(() => {
    if (!isPaymentComplete) return;

    setTimeout(() => navigate("/"), 2000);
  }, [isPaymentComplete]);


  if (!loaded) return <></>;

    return (
      <div className="bg-[#F3F4F6] w-full h-screen relative">
      <div className="max-w-[480px] w-full absolute left-1/2 top-[8%] -translate-x-1/2 ">
        <div className="flex pb-1 w-full items-center justify-center">
          <img
            src={laudspeakerLogo}
            className="max-w-[24px] max-h-[34px] mr-4"
            alt=""
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="174"
            height="29"
            viewBox="0 0 174 29"
            className="pt-[4px]"
            fill="none"
          >
            <path
              d="M4.61783 0.856934V21.0732H0.792206V0.856934H4.61783ZM7.41382 13.4511C7.41382 11.9212 7.71441 10.5644 8.31558 9.38055C8.93496 8.19672 9.76385 7.28607 10.8022 6.64862C11.8588 6.01117 13.0339 5.69245 14.3273 5.69245C15.4567 5.69245 16.4405 5.92011 17.2785 6.37543C18.1347 6.83075 18.8178 7.40446 19.3279 8.09655V5.93832H23.1809V21.0732H19.3279V18.8603C18.8361 19.5707 18.1529 20.1626 17.2785 20.6361C16.4223 21.0914 15.4294 21.3191 14.2999 21.3191C13.0247 21.3191 11.8588 20.9913 10.8022 20.3356C9.76385 19.6799 8.93496 18.7602 8.31558 17.5763C7.71441 16.3743 7.41382 14.9992 7.41382 13.4511ZM19.3279 13.5058C19.3279 12.5769 19.1457 11.7846 18.7814 11.129C18.4171 10.4551 17.9252 9.94515 17.3058 9.59911C16.6864 9.23485 16.0215 9.05272 15.311 9.05272C14.6005 9.05272 13.9447 9.22575 13.3435 9.57179C12.7424 9.91783 12.2505 10.4278 11.8679 11.1017C11.5036 11.7573 11.3214 12.5405 11.3214 13.4511C11.3214 14.3618 11.5036 15.1631 11.8679 15.8552C12.2505 16.5291 12.7424 17.0482 13.3435 17.4124C13.9629 17.7767 14.6188 17.9588 15.311 17.9588C16.0215 17.9588 16.6864 17.7858 17.3058 17.4397C17.9252 17.0755 18.4171 16.5655 18.7814 15.9099C19.1457 15.236 19.3279 14.4346 19.3279 13.5058ZM41.2087 5.93832V21.0732H37.3557V19.1609C36.8639 19.8165 36.2172 20.3356 35.4156 20.7181C34.6322 21.0823 33.776 21.2644 32.847 21.2644C31.6628 21.2644 30.6153 21.0186 29.7045 20.5268C28.7936 20.0169 28.074 19.2792 27.5457 18.314C27.0356 17.3305 26.7806 16.1648 26.7806 14.8171V5.93832H30.6062V14.2707C30.6062 15.4728 30.9068 16.4016 31.508 17.0573C32.1092 17.6947 32.9289 18.0134 33.9673 18.0134C35.0239 18.0134 35.8528 17.6947 36.454 17.0573C37.0551 16.4016 37.3557 15.4728 37.3557 14.2707V5.93832H41.2087ZM43.9996 13.4511C43.9996 11.9212 44.3002 10.5644 44.9013 9.38055C45.5207 8.19672 46.3587 7.28607 47.4153 6.64862C48.4719 6.01117 49.6469 5.69245 50.9404 5.69245C51.9241 5.69245 52.8623 5.911 53.7549 6.34811C54.6476 6.76701 55.358 7.33161 55.8863 8.04191V0.856934H59.7666V21.0732H55.8863V18.833C55.4127 19.5798 54.7478 20.1808 53.8916 20.6361C53.0353 21.0914 52.0425 21.3191 50.913 21.3191C49.6378 21.3191 48.4719 20.9913 47.4153 20.3356C46.3587 19.6799 45.5207 18.7602 44.9013 17.5763C44.3002 16.3743 43.9996 14.9992 43.9996 13.4511ZM55.9137 13.5058C55.9137 12.5769 55.7315 11.7846 55.3671 11.129C55.0028 10.4551 54.5109 9.94515 53.8916 9.59911C53.2722 9.23485 52.6072 9.05272 51.8968 9.05272C51.1863 9.05272 50.5305 9.22575 49.9293 9.57179C49.3281 9.91783 48.8363 10.4278 48.4537 11.1017C48.0894 11.7573 47.9072 12.5405 47.9072 13.4511C47.9072 14.3618 48.0894 15.1631 48.4537 15.8552C48.8363 16.5291 49.3281 17.0482 49.9293 17.4124C50.5487 17.7767 51.2045 17.9588 51.8968 17.9588C52.6072 17.9588 53.2722 17.7858 53.8916 17.4397C54.5109 17.0755 55.0028 16.5655 55.3671 15.9099C55.7315 15.236 55.9137 14.4346 55.9137 13.5058ZM69.2961 21.3191C68.0573 21.3191 66.9461 21.1005 65.9623 20.6634C64.9786 20.2081 64.1952 19.598 63.6123 18.833C63.0476 18.0681 62.7379 17.2212 62.6832 16.2923H66.5362C66.609 16.8751 66.8914 17.3578 67.3833 17.7403C67.8933 18.1227 68.5218 18.314 69.2688 18.314C69.9974 18.314 70.5622 18.1683 70.963 17.8769C71.382 17.5854 71.5915 17.2121 71.5915 16.7568C71.5915 16.265 71.3364 15.9008 70.8263 15.664C70.3345 15.409 69.542 15.1358 68.449 14.8444C67.3195 14.5712 66.3904 14.2889 65.6617 13.9975C64.9513 13.7061 64.3319 13.2599 63.8036 12.6589C63.2935 12.0578 63.0385 11.2474 63.0385 10.2275C63.0385 9.38966 63.2753 8.62472 63.7489 7.93263C64.2408 7.24054 64.933 6.69416 65.8257 6.29347C66.7366 5.89279 67.8023 5.69245 69.0228 5.69245C70.8263 5.69245 72.2655 6.14777 73.3403 7.05841C74.4151 7.95084 75.0072 9.162 75.1165 10.6919H71.4548C71.4002 10.0909 71.1451 9.61732 70.6897 9.27128C70.2525 8.90702 69.6604 8.72489 68.9135 8.72489C68.2213 8.72489 67.6838 8.85238 67.3013 9.10736C66.9369 9.36234 66.7548 9.71749 66.7548 10.1728C66.7548 10.6828 67.0098 11.0744 67.5199 11.3475C68.03 11.6025 68.8224 11.8666 69.8972 12.1398C70.9903 12.413 71.892 12.6953 72.6025 12.9867C73.313 13.2781 73.9233 13.7334 74.4333 14.3527C74.9617 14.9537 75.2349 15.7551 75.2531 16.7568C75.2531 17.631 75.0072 18.4141 74.5153 19.1062C74.0417 19.7983 73.3494 20.3447 72.4386 20.7454C71.5459 21.1279 70.4984 21.3191 69.2961 21.3191ZM82.219 8.12386C82.7109 7.43178 83.385 6.85807 84.2412 6.40275C85.1156 5.92922 86.1084 5.69245 87.2197 5.69245C88.5131 5.69245 89.679 6.01117 90.7174 6.64862C91.774 7.28607 92.6029 8.19672 93.2041 9.38055C93.8234 10.5462 94.1331 11.903 94.1331 13.4511C94.1331 14.9992 93.8234 16.3743 93.2041 17.5763C92.6029 18.7602 91.774 19.6799 90.7174 20.3356C89.679 20.9913 88.5131 21.3191 87.2197 21.3191C86.1084 21.3191 85.1247 21.0914 84.2685 20.6361C83.4305 20.1808 82.7473 19.6071 82.219 18.915V28.2855H78.3934V5.93832H82.219V8.12386ZM90.2255 13.4511C90.2255 12.5405 90.0343 11.7573 89.6517 11.1017C89.2873 10.4278 88.7955 9.91783 88.1761 9.57179C87.5749 9.22575 86.9191 9.05272 86.2086 9.05272C85.5164 9.05272 84.8606 9.23485 84.2412 9.59911C83.64 9.94515 83.1481 10.4551 82.7656 11.129C82.4012 11.8029 82.219 12.5951 82.219 13.5058C82.219 14.4164 82.4012 15.2087 82.7656 15.8825C83.1481 16.5564 83.64 17.0755 84.2412 17.4397C84.8606 17.7858 85.5164 17.9588 86.2086 17.9588C86.9191 17.9588 87.5749 17.7767 88.1761 17.4124C88.7955 17.0482 89.2873 16.5291 89.6517 15.8552C90.0343 15.1814 90.2255 14.38 90.2255 13.4511ZM110.986 13.1779C110.986 13.7243 110.95 14.2161 110.877 14.6532H99.8097C99.9007 15.7459 100.283 16.602 100.957 17.2212C101.631 17.8404 102.46 18.15 103.444 18.15C104.865 18.15 105.876 17.5399 106.477 16.3197H110.603C110.166 17.7767 109.328 18.9787 108.089 19.9258C106.851 20.8547 105.329 21.3191 103.526 21.3191C102.069 21.3191 100.757 21.0004 99.591 20.3629C98.4433 19.7072 97.5416 18.7875 96.8858 17.6037C96.2482 16.4198 95.9294 15.0539 95.9294 13.5058C95.9294 11.9395 96.2482 10.5644 96.8858 9.38055C97.5234 8.19672 98.416 7.28607 99.5637 6.64862C100.711 6.01117 102.032 5.69245 103.526 5.69245C104.965 5.69245 106.249 6.00207 107.379 6.6213C108.527 7.24054 109.41 8.12387 110.03 9.27128C110.667 10.4005 110.986 11.7027 110.986 13.1779ZM107.024 12.0852C107.005 11.1017 106.65 10.3185 105.958 9.7357C105.266 9.13468 104.419 8.83417 103.417 8.83417C102.469 8.83417 101.668 9.12557 101.012 9.70839C100.374 10.273 99.9827 11.0652 99.837 12.0852H107.024ZM112.795 13.4511C112.795 11.9212 113.095 10.5644 113.696 9.38055C114.316 8.19672 115.145 7.28607 116.183 6.64862C117.24 6.01117 118.415 5.69245 119.708 5.69245C120.837 5.69245 121.821 5.92011 122.659 6.37543C123.515 6.83075 124.199 7.40446 124.709 8.09655V5.93832H128.562V21.0732H124.709V18.8603C124.217 19.5707 123.534 20.1626 122.659 20.6361C121.803 21.0914 120.81 21.3191 119.681 21.3191C118.405 21.3191 117.24 20.9913 116.183 20.3356C115.145 19.6799 114.316 18.7602 113.696 17.5763C113.095 16.3743 112.795 14.9992 112.795 13.4511ZM124.709 13.5058C124.709 12.5769 124.526 11.7846 124.162 11.129C123.798 10.4551 123.306 9.94515 122.687 9.59911C122.067 9.23485 121.402 9.05272 120.692 9.05272C119.981 9.05272 119.325 9.22575 118.724 9.57179C118.123 9.91783 117.631 10.4278 117.249 11.1017C116.884 11.7573 116.702 12.5405 116.702 13.4511C116.702 14.3618 116.884 15.1631 117.249 15.8552C117.631 16.5291 118.123 17.0482 118.724 17.4124C119.344 17.7767 119.999 17.9588 120.692 17.9588C121.402 17.9588 122.067 17.7858 122.687 17.4397C123.306 17.0755 123.798 16.5655 124.162 15.9099C124.526 15.236 124.709 14.4346 124.709 13.5058ZM141.261 21.0732L136.124 14.6259V21.0732H132.298V0.856934H136.124V12.3584L141.207 5.93832H146.18L139.512 13.5331L146.235 21.0732H141.261ZM162.329 13.1779C162.329 13.7243 162.292 14.2161 162.219 14.6532H151.152C151.244 15.7459 151.626 16.602 152.3 17.2212C152.974 17.8404 153.803 18.15 154.787 18.15C156.208 18.15 157.219 17.5399 157.82 16.3197H161.946C161.509 17.7767 160.671 18.9787 159.432 19.9258C158.193 20.8547 156.672 21.3191 154.869 21.3191C153.411 21.3191 152.1 21.0004 150.934 20.3629C149.786 19.7072 148.884 18.7875 148.229 17.6037C147.591 16.4198 147.272 15.0539 147.272 13.5058C147.272 11.9395 147.591 10.5644 148.229 9.38055C148.866 8.19672 149.759 7.28607 150.907 6.64862C152.054 6.01117 153.375 5.69245 154.869 5.69245C156.308 5.69245 157.592 6.00207 158.722 6.6213C159.869 7.24054 160.753 8.12387 161.372 9.27128C162.01 10.4005 162.329 11.7027 162.329 13.1779ZM158.367 12.0852C158.348 11.1017 157.993 10.3185 157.301 9.7357C156.609 9.13468 155.761 8.83417 154.76 8.83417C153.812 8.83417 153.011 9.12557 152.355 9.70839C151.717 10.273 151.326 11.0652 151.18 12.0852H158.367ZM168.947 8.28778C169.439 7.48642 170.076 6.85807 170.86 6.40275C171.661 5.94743 172.572 5.71977 173.592 5.71977V9.7357H172.581C171.379 9.7357 170.468 10.018 169.849 10.5826C169.247 11.1472 168.947 12.1307 168.947 13.5331V21.0732H165.121V5.93832H168.947V8.28778Z"
              fill="#111827"
            />
          </svg>
        </div>
        <div className="mt-14 p-10 rounded-xl bg-white">
          <div className="text-[#111827] text-3xl font-roboto font-medium mb-5">
            You selected the start up plan
          </div>
        </div>
      </div>
    </div>
    );

  /*
  return (
    <div className="bg-[#F3F4F6] w-full h-screen relative">
      <div className="max-w-[480px] w-full absolute left-1/2 top-[8%] -translate-x-1/2 ">
        <div className="flex pb-1 w-full items-center justify-center">
          <img
            src={laudspeakerLogo}
            className="max-w-[24px] max-h-[34px] mr-4"
            alt=""
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="174"
            height="29"
            viewBox="0 0 174 29"
            className="pt-[4px]"
            fill="none"
          >
            <path
              d="M4.61783 0.856934V21.0732H0.792206V0.856934H4.61783ZM7.41382 13.4511C7.41382 11.9212 7.71441 10.5644 8.31558 9.38055C8.93496 8.19672 9.76385 7.28607 10.8022 6.64862C11.8588 6.01117 13.0339 5.69245 14.3273 5.69245C15.4567 5.69245 16.4405 5.92011 17.2785 6.37543C18.1347 6.83075 18.8178 7.40446 19.3279 8.09655V5.93832H23.1809V21.0732H19.3279V18.8603C18.8361 19.5707 18.1529 20.1626 17.2785 20.6361C16.4223 21.0914 15.4294 21.3191 14.2999 21.3191C13.0247 21.3191 11.8588 20.9913 10.8022 20.3356C9.76385 19.6799 8.93496 18.7602 8.31558 17.5763C7.71441 16.3743 7.41382 14.9992 7.41382 13.4511ZM19.3279 13.5058C19.3279 12.5769 19.1457 11.7846 18.7814 11.129C18.4171 10.4551 17.9252 9.94515 17.3058 9.59911C16.6864 9.23485 16.0215 9.05272 15.311 9.05272C14.6005 9.05272 13.9447 9.22575 13.3435 9.57179C12.7424 9.91783 12.2505 10.4278 11.8679 11.1017C11.5036 11.7573 11.3214 12.5405 11.3214 13.4511C11.3214 14.3618 11.5036 15.1631 11.8679 15.8552C12.2505 16.5291 12.7424 17.0482 13.3435 17.4124C13.9629 17.7767 14.6188 17.9588 15.311 17.9588C16.0215 17.9588 16.6864 17.7858 17.3058 17.4397C17.9252 17.0755 18.4171 16.5655 18.7814 15.9099C19.1457 15.236 19.3279 14.4346 19.3279 13.5058ZM41.2087 5.93832V21.0732H37.3557V19.1609C36.8639 19.8165 36.2172 20.3356 35.4156 20.7181C34.6322 21.0823 33.776 21.2644 32.847 21.2644C31.6628 21.2644 30.6153 21.0186 29.7045 20.5268C28.7936 20.0169 28.074 19.2792 27.5457 18.314C27.0356 17.3305 26.7806 16.1648 26.7806 14.8171V5.93832H30.6062V14.2707C30.6062 15.4728 30.9068 16.4016 31.508 17.0573C32.1092 17.6947 32.9289 18.0134 33.9673 18.0134C35.0239 18.0134 35.8528 17.6947 36.454 17.0573C37.0551 16.4016 37.3557 15.4728 37.3557 14.2707V5.93832H41.2087ZM43.9996 13.4511C43.9996 11.9212 44.3002 10.5644 44.9013 9.38055C45.5207 8.19672 46.3587 7.28607 47.4153 6.64862C48.4719 6.01117 49.6469 5.69245 50.9404 5.69245C51.9241 5.69245 52.8623 5.911 53.7549 6.34811C54.6476 6.76701 55.358 7.33161 55.8863 8.04191V0.856934H59.7666V21.0732H55.8863V18.833C55.4127 19.5798 54.7478 20.1808 53.8916 20.6361C53.0353 21.0914 52.0425 21.3191 50.913 21.3191C49.6378 21.3191 48.4719 20.9913 47.4153 20.3356C46.3587 19.6799 45.5207 18.7602 44.9013 17.5763C44.3002 16.3743 43.9996 14.9992 43.9996 13.4511ZM55.9137 13.5058C55.9137 12.5769 55.7315 11.7846 55.3671 11.129C55.0028 10.4551 54.5109 9.94515 53.8916 9.59911C53.2722 9.23485 52.6072 9.05272 51.8968 9.05272C51.1863 9.05272 50.5305 9.22575 49.9293 9.57179C49.3281 9.91783 48.8363 10.4278 48.4537 11.1017C48.0894 11.7573 47.9072 12.5405 47.9072 13.4511C47.9072 14.3618 48.0894 15.1631 48.4537 15.8552C48.8363 16.5291 49.3281 17.0482 49.9293 17.4124C50.5487 17.7767 51.2045 17.9588 51.8968 17.9588C52.6072 17.9588 53.2722 17.7858 53.8916 17.4397C54.5109 17.0755 55.0028 16.5655 55.3671 15.9099C55.7315 15.236 55.9137 14.4346 55.9137 13.5058ZM69.2961 21.3191C68.0573 21.3191 66.9461 21.1005 65.9623 20.6634C64.9786 20.2081 64.1952 19.598 63.6123 18.833C63.0476 18.0681 62.7379 17.2212 62.6832 16.2923H66.5362C66.609 16.8751 66.8914 17.3578 67.3833 17.7403C67.8933 18.1227 68.5218 18.314 69.2688 18.314C69.9974 18.314 70.5622 18.1683 70.963 17.8769C71.382 17.5854 71.5915 17.2121 71.5915 16.7568C71.5915 16.265 71.3364 15.9008 70.8263 15.664C70.3345 15.409 69.542 15.1358 68.449 14.8444C67.3195 14.5712 66.3904 14.2889 65.6617 13.9975C64.9513 13.7061 64.3319 13.2599 63.8036 12.6589C63.2935 12.0578 63.0385 11.2474 63.0385 10.2275C63.0385 9.38966 63.2753 8.62472 63.7489 7.93263C64.2408 7.24054 64.933 6.69416 65.8257 6.29347C66.7366 5.89279 67.8023 5.69245 69.0228 5.69245C70.8263 5.69245 72.2655 6.14777 73.3403 7.05841C74.4151 7.95084 75.0072 9.162 75.1165 10.6919H71.4548C71.4002 10.0909 71.1451 9.61732 70.6897 9.27128C70.2525 8.90702 69.6604 8.72489 68.9135 8.72489C68.2213 8.72489 67.6838 8.85238 67.3013 9.10736C66.9369 9.36234 66.7548 9.71749 66.7548 10.1728C66.7548 10.6828 67.0098 11.0744 67.5199 11.3475C68.03 11.6025 68.8224 11.8666 69.8972 12.1398C70.9903 12.413 71.892 12.6953 72.6025 12.9867C73.313 13.2781 73.9233 13.7334 74.4333 14.3527C74.9617 14.9537 75.2349 15.7551 75.2531 16.7568C75.2531 17.631 75.0072 18.4141 74.5153 19.1062C74.0417 19.7983 73.3494 20.3447 72.4386 20.7454C71.5459 21.1279 70.4984 21.3191 69.2961 21.3191ZM82.219 8.12386C82.7109 7.43178 83.385 6.85807 84.2412 6.40275C85.1156 5.92922 86.1084 5.69245 87.2197 5.69245C88.5131 5.69245 89.679 6.01117 90.7174 6.64862C91.774 7.28607 92.6029 8.19672 93.2041 9.38055C93.8234 10.5462 94.1331 11.903 94.1331 13.4511C94.1331 14.9992 93.8234 16.3743 93.2041 17.5763C92.6029 18.7602 91.774 19.6799 90.7174 20.3356C89.679 20.9913 88.5131 21.3191 87.2197 21.3191C86.1084 21.3191 85.1247 21.0914 84.2685 20.6361C83.4305 20.1808 82.7473 19.6071 82.219 18.915V28.2855H78.3934V5.93832H82.219V8.12386ZM90.2255 13.4511C90.2255 12.5405 90.0343 11.7573 89.6517 11.1017C89.2873 10.4278 88.7955 9.91783 88.1761 9.57179C87.5749 9.22575 86.9191 9.05272 86.2086 9.05272C85.5164 9.05272 84.8606 9.23485 84.2412 9.59911C83.64 9.94515 83.1481 10.4551 82.7656 11.129C82.4012 11.8029 82.219 12.5951 82.219 13.5058C82.219 14.4164 82.4012 15.2087 82.7656 15.8825C83.1481 16.5564 83.64 17.0755 84.2412 17.4397C84.8606 17.7858 85.5164 17.9588 86.2086 17.9588C86.9191 17.9588 87.5749 17.7767 88.1761 17.4124C88.7955 17.0482 89.2873 16.5291 89.6517 15.8552C90.0343 15.1814 90.2255 14.38 90.2255 13.4511ZM110.986 13.1779C110.986 13.7243 110.95 14.2161 110.877 14.6532H99.8097C99.9007 15.7459 100.283 16.602 100.957 17.2212C101.631 17.8404 102.46 18.15 103.444 18.15C104.865 18.15 105.876 17.5399 106.477 16.3197H110.603C110.166 17.7767 109.328 18.9787 108.089 19.9258C106.851 20.8547 105.329 21.3191 103.526 21.3191C102.069 21.3191 100.757 21.0004 99.591 20.3629C98.4433 19.7072 97.5416 18.7875 96.8858 17.6037C96.2482 16.4198 95.9294 15.0539 95.9294 13.5058C95.9294 11.9395 96.2482 10.5644 96.8858 9.38055C97.5234 8.19672 98.416 7.28607 99.5637 6.64862C100.711 6.01117 102.032 5.69245 103.526 5.69245C104.965 5.69245 106.249 6.00207 107.379 6.6213C108.527 7.24054 109.41 8.12387 110.03 9.27128C110.667 10.4005 110.986 11.7027 110.986 13.1779ZM107.024 12.0852C107.005 11.1017 106.65 10.3185 105.958 9.7357C105.266 9.13468 104.419 8.83417 103.417 8.83417C102.469 8.83417 101.668 9.12557 101.012 9.70839C100.374 10.273 99.9827 11.0652 99.837 12.0852H107.024ZM112.795 13.4511C112.795 11.9212 113.095 10.5644 113.696 9.38055C114.316 8.19672 115.145 7.28607 116.183 6.64862C117.24 6.01117 118.415 5.69245 119.708 5.69245C120.837 5.69245 121.821 5.92011 122.659 6.37543C123.515 6.83075 124.199 7.40446 124.709 8.09655V5.93832H128.562V21.0732H124.709V18.8603C124.217 19.5707 123.534 20.1626 122.659 20.6361C121.803 21.0914 120.81 21.3191 119.681 21.3191C118.405 21.3191 117.24 20.9913 116.183 20.3356C115.145 19.6799 114.316 18.7602 113.696 17.5763C113.095 16.3743 112.795 14.9992 112.795 13.4511ZM124.709 13.5058C124.709 12.5769 124.526 11.7846 124.162 11.129C123.798 10.4551 123.306 9.94515 122.687 9.59911C122.067 9.23485 121.402 9.05272 120.692 9.05272C119.981 9.05272 119.325 9.22575 118.724 9.57179C118.123 9.91783 117.631 10.4278 117.249 11.1017C116.884 11.7573 116.702 12.5405 116.702 13.4511C116.702 14.3618 116.884 15.1631 117.249 15.8552C117.631 16.5291 118.123 17.0482 118.724 17.4124C119.344 17.7767 119.999 17.9588 120.692 17.9588C121.402 17.9588 122.067 17.7858 122.687 17.4397C123.306 17.0755 123.798 16.5655 124.162 15.9099C124.526 15.236 124.709 14.4346 124.709 13.5058ZM141.261 21.0732L136.124 14.6259V21.0732H132.298V0.856934H136.124V12.3584L141.207 5.93832H146.18L139.512 13.5331L146.235 21.0732H141.261ZM162.329 13.1779C162.329 13.7243 162.292 14.2161 162.219 14.6532H151.152C151.244 15.7459 151.626 16.602 152.3 17.2212C152.974 17.8404 153.803 18.15 154.787 18.15C156.208 18.15 157.219 17.5399 157.82 16.3197H161.946C161.509 17.7767 160.671 18.9787 159.432 19.9258C158.193 20.8547 156.672 21.3191 154.869 21.3191C153.411 21.3191 152.1 21.0004 150.934 20.3629C149.786 19.7072 148.884 18.7875 148.229 17.6037C147.591 16.4198 147.272 15.0539 147.272 13.5058C147.272 11.9395 147.591 10.5644 148.229 9.38055C148.866 8.19672 149.759 7.28607 150.907 6.64862C152.054 6.01117 153.375 5.69245 154.869 5.69245C156.308 5.69245 157.592 6.00207 158.722 6.6213C159.869 7.24054 160.753 8.12387 161.372 9.27128C162.01 10.4005 162.329 11.7027 162.329 13.1779ZM158.367 12.0852C158.348 11.1017 157.993 10.3185 157.301 9.7357C156.609 9.13468 155.761 8.83417 154.76 8.83417C153.812 8.83417 153.011 9.12557 152.355 9.70839C151.717 10.273 151.326 11.0652 151.18 12.0852H158.367ZM168.947 8.28778C169.439 7.48642 170.076 6.85807 170.86 6.40275C171.661 5.94743 172.572 5.71977 173.592 5.71977V9.7357H172.581C171.379 9.7357 170.468 10.018 169.849 10.5826C169.247 11.1472 168.947 12.1307 168.947 13.5331V21.0732H165.121V5.93832H168.947V8.28778Z"
              fill="#111827"
            />
          </svg>
        </div>
        <div className="mt-14 p-10 rounded-xl bg-white">
          <div className="text-[#111827] text-3xl font-roboto font-medium mb-5">
            You selected the start up plan
          </div>
          <StripeButton />
        </div>
      </div>
    </div>
  );
  */
  
};

export default SubscriptionPayment;
