import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Appearance, StripeElementsOptions } from "@stripe/stripe-js";
import * as React from "react";

import { prepareCardPaymentMethodDataFromElements } from "$app/data/card_payment_method_data";
import { AnyPaymentMethodResult } from "$app/data/payment_method_result";
import { getStripeInstance } from "$app/utils/stripe_loader";
import { getCssVariable } from "$app/utils/styles";

import { getTotalPrice, isProcessing, paymentElementMode, useState } from "$app/components/Checkout/payment";
import { useFont } from "$app/components/DesignSettings";
import { useLoggedInUser } from "$app/components/LoggedInUser";
import { Checkbox } from "$app/components/ui/Checkbox";
import { Fieldset, FieldsetTitle } from "$app/components/ui/Fieldset";
import { Label } from "$app/components/ui/Label";
import { useIsDarkTheme } from "$app/components/useIsDarkTheme";

// Phase 1 of the Stripe Payment Element migration (issue #5362). Card-only surface replacement for the
// existing CardElement path: the buyer enters their card into the Payment Element, we create the
// PaymentMethod client-side with the deferred-intent flow, and send the unchanged backend payload.
// Wallets and Link are disabled here so the existing Payment Request wallet buttons are not duplicated.

const useFail = () => {
  const [, dispatch] = useState();
  return React.useCallback(() => dispatch({ type: "cancel" }), [dispatch]);
};

const PaymentElementBody = () => {
  const [state, dispatch] = useState();
  const stripe = useStripe();
  const elements = useElements();
  const fail = useFail();
  const isLoggedIn = !!useLoggedInUser();

  const [keepOnFile, setKeepOnFile] = React.useState(isLoggedIn);
  const [cardError, setCardError] = React.useState(false);

  React.useEffect(() => {
    dispatch({ type: "add-payment-method", paymentMethod: { type: "card", button: null } });
  }, []);

  React.useEffect(() => {
    if (state.status.type !== "starting" || state.paymentMethod !== "card") return;
    void (async () => {
      if (!stripe || !elements) {
        setCardError(true);
        return dispatch({ type: "cancel" });
      }

      const cardParams = await prepareCardPaymentMethodDataFromElements({
        stripe,
        elements,
        email: state.email,
        zipCode: state.zipCode,
      });

      if (cardParams.status === "error") {
        if (cardParams.stripe_error.type === "validation_error") {
          setCardError(true);
          return dispatch({ type: "cancel" });
        }
        return dispatch({
          type: "set-payment-method",
          paymentMethod: { type: "new", cardParamsResult: { type: "error", cardParams } },
        });
      }

      const paymentMethod: AnyPaymentMethodResult = {
        type: "new",
        cardParamsResult: {
          type: "cc",
          cardParams,
          keepOnFile: isLoggedIn ? keepOnFile : null,
          zipCode: state.zipCode,
        },
      };
      dispatch({ type: "set-payment-method", paymentMethod });
    })().catch(fail);
  }, [state.status.type]);

  return (
    <div className="flex flex-col gap-4">
      <Fieldset state={cardError ? "danger" : undefined}>
        <FieldsetTitle>
          <Label>Card information</Label>
        </FieldsetTitle>
        <PaymentElement
          options={{ wallets: { applePay: "never", googlePay: "never" } }}
          onChange={() => setCardError(false)}
        />
      </Fieldset>
      {isLoggedIn ? (
        <Label className="flex items-center gap-2">
          <Checkbox
            disabled={isProcessing(state)}
            checked={keepOnFile}
            onChange={(evt) => setKeepOnFile(evt.target.checked)}
          />
          Save card for future purchases
        </Label>
      ) : null}
    </div>
  );
};

// Gumroad's CSS color variables are stored as space-separated RGB triplets (e.g. "0 0 0").
const cssColor = (name: string) => {
  const value = getCssVariable(name).trim();
  return value ? `rgb(${value.split(" ").join(", ")})` : undefined;
};

export const PaymentElementCardContent = () => {
  const [state] = useState();
  const font = useFont();
  const isDark = useIsDarkTheme();
  const [stripePromise] = React.useState(getStripeInstance);

  // Match the Payment Element to the checkout's light/dark theme; otherwise Stripe's default
  // light theme renders dark labels that are invisible on the dark checkout surface.
  const appearance: Appearance = {
    theme: isDark ? "night" : "stripe",
    variables: {
      fontFamily: font.name,
      colorText: cssColor("color"),
      colorBackground: cssColor("filled"),
      colorPrimary: cssColor("accent"),
      colorDanger: cssColor("danger"),
    },
  };

  const sharedOptions = {
    currency: "usd",
    paymentMethodCreation: "manual",
    paymentMethodTypes: ["card"],
    appearance,
    fonts: [{ family: font.name, src: `url(${font.url})` }],
  } satisfies Partial<StripeElementsOptions>;

  // Free trials use setup mode (no immediate charge); everything else charges the cart total now.
  const options: StripeElementsOptions =
    paymentElementMode(state) === "setup"
      ? { mode: "setup", ...sharedOptions }
      : { mode: "payment", amount: getTotalPrice(state) ?? 0, ...sharedOptions };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentElementBody />
    </Elements>
  );
};
