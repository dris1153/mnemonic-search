import axios from "axios";
import fs from "fs";
import path from "path";

export const getBalanceUSD = async (address: string) => {
  const data = await axios.get<{
    request_time: string;
    response_time: string;
    wallet_address: string;
    balances: {
      chain: string;
      chain_id: number;
      address: string;
      amount: string;
      symbol: string;
      decimals: number;
      price_usd?: number;
      value_usd?: number;
      pool_size?: number;
    }[];
  }>(`https://api.dune.com/api/echo/v1/balances/evm/${address}`, {
    headers: {
      "X-Dune-Api-Key": "6Laq6lH8xuz932FLQKM3VyrfiNFjKogY",
    },
  });
  if (data?.data?.balances?.length > 0) {
    const balanceUSD = data?.data?.balances?.reduce((curr, acc) => {
      return curr + Number(acc?.value_usd || 0);
    }, 0);
    return balanceUSD;
  }
  return 0;
};

export const writeWalletToFile = ({
  address,
  mnemonic,
  accountIndex,
  privateKey,
  balanceUSD,
}: {
  address: string;
  mnemonic: string;
  accountIndex: number;
  privateKey: string;
  balanceUSD: number;
}) => {
  // Write the wallet information to a file
  const filePath = path.join(__dirname, "/data/wallets.txt");
  const walletInfo = `Address: ${address}\nMnemonic: ${mnemonic}\nAccount Index: ${accountIndex}\nPrivate Key: ${privateKey}\nBalance (USD): ${balanceUSD}\n\n--------------------------------------------------------------------------\n\n`;
  fs.appendFile(filePath, walletInfo, (err) => {
    if (err) {
      console.error("Error writing to file:", err);
    } else {
      console.log("Wallet information saved to wallets.txt");
    }
  });
};
