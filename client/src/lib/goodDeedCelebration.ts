export type GoodDeedCelebrationKind =
  | 'foundReport'
  | 'lostPost'
  | 'foundPost'
  | 'claimAccepted'
  | 'foundReportAccepted'
  | 'returnCompleted';

export const GOOD_DEED_CELEBRATIONS: Record<
  GoodDeedCelebrationKind,
  { title: string; message: string }
> = {
  foundReport: {
    title: '🔎 Nice find!',
    message:
      'You might have just helped someone get back something important. Thanks for looking out for your campus community. 🧡',
  },
  lostPost: {
    title: "💛 Don't lose hope!",
    message:
      'Your lost item is now on ReclaimIt. Someone on campus might recognize it and help bring it back to you.',
  },
  foundPost: {
    title: '🌟 You did a great thing!',
    message:
      'Your found item is now posted on ReclaimIt. Hopefully, it finds its way back to its owner soon. 🧡',
  },
  claimAccepted: {
    title: "🎉 It's happening!",
    message: "Your claim was accepted! You're one step closer to getting your item back. 🧡",
  },
  foundReportAccepted: {
    title: '🧡 Great news!',
    message:
      "Your Found Report was accepted. You're helping reunite a lost item with its owner!",
  },
  returnCompleted: {
    title: '🏠 Back where it belongs!',
    message: 'The item has been successfully returned. What a great ending! 🎉',
  },
};
