import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type PaymentRouteParams =
  | undefined
  | {
      items?: Array<{
        id: string;
        /** MongoDB product _id — used to deduct inventory after payment */
        productId?: string;
        name: string;
        price: number;
        quantity: number;
      }>;
      /** Payable amount after ZOOMPOINTS (LKR). */
      totalAmount?: number;
      /** Cart subtotal before redemption (LKR). */
      orderSubtotal?: number;
      loyaltyPointsRedeemed?: number;
      title?: string;
      /** Shared-cart checkout: end session locally + notify room when payment completes */
      sharedSessionId?: string;
    };

/** Saved personal checkout opened from Recent sessions (read-only line items). */
export type PersonalCartHistoryReceipt = {
  title: string;
  totalAmount: number;
  createdAt: string;
  items?: Array<{ name: string; price: number; quantity: number }>;
};

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  ProductScan: { closeAfterAdd?: boolean; sharedSessionId?: string } | undefined;
  SharedCart: undefined;
  SharedCartSetup: undefined;
  ActiveSharedSession: { sessionId: string };
  PersonalCart: { historyReceipt?: PersonalCartHistoryReceipt } | undefined;
  PaymentGateway: PaymentRouteParams;
  PaymentQR: PaymentRouteParams;
  PaymentSuccess: {
    paymentId: string;
    orderId: string;
    /** Amount paid in LKR (after ZOOMPOINTS redemption). */
    amount: number;
    customer: {
      name: string;
      email: string;
      phone: string;
    } | null;
    /** Line items for receipt PDF (names, qty, prices). */
    items?: Array<{ name: string; price: number; quantity: number }>;
    /** Cart subtotal before redemption. */
    orderSubtotal?: number;
    loyaltyPointsRedeemed?: number;
    /** Present when checkout was shared-session payment — hides phantom \"live\" on Home after success screen. */
    sharedSessionId?: string;
  };
  /** Shown after a shared shopping session ends — summary + PDF receipt. */
  SessionReceipt: {
    sessionId: string;
    createdAt: string;
    endedAt: string;
    customerName: string;
    items: Array<{ name: string; price: number; quantity: number }>;
    totalAmount: number;
    participantCount: number;
  };
  Profile: undefined;
  Settings: undefined;
  PrivacyPolicy: undefined;
  StoreNavigation: undefined;
  BudgetLimiter: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

export type RootStackNavigationProp<T extends keyof RootStackParamList> =
  NativeStackNavigationProp<RootStackParamList, T>;
