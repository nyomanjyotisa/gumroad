import { CreditCard } from "@boxicons/react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Appearance, StripeElementsOptions } from "@stripe/stripe-js";
import * as React from "react";

import {
  confirmCardIfNeeded,
  prepareCardPaymentMethodDataFromElements,
  prepareFutureCharges,
} from "$app/data/card_payment_method_data";
import { AnyPaymentMethodResult } from "$app/data/payment_method_result";
import { SavedCreditCard } from "$app/parsers/card";
import { getStripeInstance } from "$app/utils/stripe_loader";
import { getCssVariable } from "$app/utils/styles";

import {
  getTotalPrice,
  isProcessing,
  paymentElementMode,
  requiresReusablePaymentMethod,
  useState,
} from "$app/components/Checkout/payment";
import { useFont } from "$app/components/DesignSettings";
import { useLoggedInUser } from "$app/components/LoggedInUser";
import { Checkbox } from "$app/components/ui/Checkbox";
import { Fieldset, FieldsetTitle } from "$app/components/ui/Fieldset";
import { InputGroup } from "$app/components/ui/InputGroup";
import { Label } from "$app/components/ui/Label";
import { useIsDarkTheme } from "$app/components/useIsDarkTheme";

// Stripe Payment Element migration (issue #5362). Card-only surface replacement for the existing
// CardElement path: the buyer enters their card into the Payment Element, we create the
// PaymentMethod client-side with the deferred-intent flow, and send the unchanged backend payload.
// Wallets and Link inside the Element are disabled so the existing Payment Request wallet buttons
// are not duplicated. Reusable carts (multi-seller, managed subscriptions, commissions) and free
// trials mount in setup mode and turn the card into a reusable pm via the existing SetupIntent
// flow; everything else charges the cart total now. See isPaymentElementEligible / paymentElementMode.

const useFail = () => {
  const [, dispatch] = useState();
  return React.useCallback(() => dispatch({ type: "cancel" }), [dispatch]);
};

const PaymentElementBody = ({ toggle }: { toggle: React.ReactNode }) => {
  const [state, dispatch] = useState();
  const stripe = useStripe();
  const elements = useElements();
  const fail = useFail();
  const isLoggedIn = !!useLoggedInUser();

  const [keepOnFile, setKeepOnFile] = React.useState(isLoggedIn);
  const [cardError, setCardError] = React.useState(false);

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

      const keepOnFileValue = isLoggedIn ? keepOnFile : null;

      // Multi-seller (and other reusable) carts charge each seller off a saved pm, so we turn the
      // Payment Element card into a reusable pm via the existing SetupIntent flow. The SCA
      // confirmation (confirmCardIfNeeded -> confirmCardSetup) acts on the SetupIntent's
      // server-attached pm, so it doesn't conflict with createPaymentMethod({ elements }).
      if (requiresReusablePaymentMethod(state)) {
        const reusable = await prepareFutureCharges({ products: state.products, cardParams }).then(confirmCardIfNeeded);
        if (reusable.status === "error") {
          return dispatch({
            type: "set-payment-method",
            paymentMethod: { type: "new", cardParamsResult: { type: "error", cardParams: reusable } },
          });
        }
        return dispatch({
          type: "set-payment-method",
          paymentMethod: {
            type: "new",
            cardParamsResult: { type: "cc", cardParams: reusable, keepOnFile: keepOnFileValue, zipCode: state.zipCode },
          },
        });
      }

      const paymentMethod: AnyPaymentMethodResult = {
        type: "new",
        cardParamsResult: { type: "cc", cardParams, keepOnFile: keepOnFileValue, zipCode: state.zipCode },
      };
      dispatch({ type: "set-payment-method", paymentMethod });
    })().catch(fail);
  }, [state.status.type]);

  return (
    <div className="flex flex-col gap-4">
      <Fieldset state={cardError ? "danger" : undefined}>
        <FieldsetTitle>
          <Label>Card information</Label>
          {toggle}
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

// Buyers with a saved card can pay with it without mounting the Payment Element; the saved-card
// charge path is unchanged (the order request omits card params, so Rails uses the stored card).
const SavedCardBody = ({ savedCreditCard, toggle }: { savedCreditCard: SavedCreditCard; toggle: React.ReactNode }) => {
  const [state, dispatch] = useState();

  React.useEffect(() => {
    if (state.status.type !== "starting" || state.paymentMethod !== "card") return;
    dispatch({ type: "set-payment-method", paymentMethod: { type: "saved" } });
  }, [state.status.type]);

  return (
    <Fieldset>
      <FieldsetTitle>
        <Label>Card information</Label>
        {toggle}
      </FieldsetTitle>
      <InputGroup readOnly aria-label="Saved credit card">
        <CreditCard className="size-5" />
        <span>{savedCreditCard.number}</span>
        <span style={{ marginLeft: "auto" }}>{savedCreditCard.expiration_date}</span>
      </InputGroup>
    </Fieldset>
  );
};

// Gumroad's CSS color variables are stored as space-separated RGB triplets (e.g. "0 0 0").
const cssColor = (name: string) => {
  const value = getCssVariable(name).trim();
  return value ? `rgb(${value.split(" ").join(", ")})` : undefined;
};

export const PaymentElementCardContent = () => {
  const [state, dispatch] = useState();
  const font = useFont();
  const isDark = useIsDarkTheme();
  const [stripePromise] = React.useState(getStripeInstance);
  const savedCreditCard = state.savedCreditCard;
  const [useSavedCard, setUseSavedCard] = React.useState(savedCreditCard != null);

  React.useEffect(() => {
    dispatch({ type: "add-payment-method", paymentMethod: { type: "card", button: null } });
  }, []);

  const toggle =
    savedCreditCard != null ? (
      <button
        type="button"
        className="cursor-pointer font-normal underline all-unset"
        disabled={isProcessing(state)}
        onClick={() => setUseSavedCard(!useSavedCard)}
      >
        {useSavedCard ? "Use a different card?" : "Use saved card"}
      </button>
    ) : null;

  if (savedCreditCard != null && useSavedCard) {
    return <SavedCardBody savedCreditCard={savedCreditCard} toggle={toggle} />;
  }

  // Match the Payment Element to the checkout's light/dark theme; otherwise Stripe's default light
  // theme renders dark labels that are invisible on the dark checkout surface.
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

  const options: StripeElementsOptions =
    paymentElementMode(state) === "setup"
      ? { mode: "setup", ...sharedOptions }
      : { mode: "payment", amount: getTotalPrice(state) ?? 0, ...sharedOptions };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentElementBody toggle={toggle} />
    </Elements>
  );
};
