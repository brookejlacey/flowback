export const FLOWBACK_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0x56A512A9Dfa24F0Bb823a782afe3b658627C6496") as `0x${string}`;

export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ||
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e") as `0x${string}`;

export const FLOWBACK_ABI = [
  {
    type: "function",
    name: "createCampaign",
    inputs: [
      { name: "name", type: "string" },
      { name: "budget", type: "uint256" },
      { name: "payoutPer1kViews", type: "uint256" },
      { name: "minViews", type: "uint256" },
      { name: "duration", type: "uint64" },
    ],
    outputs: [{ name: "campaignId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "requestVerification",
    inputs: [
      { name: "campaignId", type: "uint256" },
      { name: "videoId", type: "string" },
      { name: "platform", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getCampaign",
    inputs: [{ name: "campaignId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "brand", type: "address" },
          { name: "name", type: "string" },
          { name: "budget", type: "uint256" },
          { name: "spent", type: "uint256" },
          { name: "payoutPer1kViews", type: "uint256" },
          { name: "minViews", type: "uint256" },
          { name: "startTime", type: "uint64" },
          { name: "endTime", type: "uint64" },
          { name: "active", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRemainingBudget",
    inputs: [{ name: "campaignId", type: "uint256" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "campaignCount",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "CampaignCreated",
    inputs: [
      { name: "campaignId", type: "uint256", indexed: true },
      { name: "brand", type: "address", indexed: true },
      { name: "budget", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "VerificationRequested",
    inputs: [
      { name: "campaignId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "videoId", type: "string", indexed: false },
      { name: "platform", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PayoutReleased",
    inputs: [
      { name: "verificationId", type: "bytes32", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;
