import { readFile } from "fs/promises";
import { ethers, Mnemonic } from "ethers";
import chalk from "chalk";
import {
  bigIntMinAndMax,
  getLargeKPermutationAtIndex,
  getPrivateKeyFromMnemonic,
  permutationCountBig,
} from "./utils";
import { getBalanceUSD, writeWalletToFile } from "./helper";
import { getValueAsBigInt, updateKeyValueInFile } from "./store";

const filePath = __dirname + "/data/word.txt";

async function readWordFile() {
  try {
    const data = await readFile(filePath, "utf-8");
    // Split the content by new lines and filter out empty lines
    const lines = data.split("\r\n").filter((line) => line.trim() !== "");
    return lines;
  } catch (error) {
    console.error("Error reading file:", error);
  }
}

async function validateAccount(mnemonic: string, index: number) {
  const account = getPrivateKeyFromMnemonic(mnemonic, "m/44'/60'/0'/0", index);
  try {
    const balanceUSD = await getBalanceUSD(account.address);
    console.log(
      chalk.bold.yellow(
        `### Account ${index}: ${
          Number(balanceUSD || 1) > 0
            ? chalk.green(balanceUSD)
            : chalk.yellow(balanceUSD)
        }`
      )
    );

    if (balanceUSD > 0) {
      writeWalletToFile({
        address: account.address,
        mnemonic: mnemonic,
        accountIndex: index,
        privateKey: account.privateKey,
        balanceUSD: balanceUSD,
      });
    }
  } catch (error) {
    console.log(
      chalk.bold.yellow(
        `### Account ${index}: ${chalk.white((error as any)?.message)}`
      )
    );
    throw new Error("Error validating account");
  }
}

async function main(count: number) {
  const words = await readWordFile();
  if (!words) {
    console.error("No words found in the file.");
    return;
  }
  const n = words.length; // 20 elements
  const k = 12;

  // Calculate the total number of permutations
  const total = permutationCountBig(n, k);

  console.log(`Total ${k}-permutations from ${n} elements: ${total}`);

  const initIndex = await getValueAsBigInt(
    "current_index",
    "src/data/store.txt",
    {
      createIfMissing: true,
      ifNotExist: BigInt(0),
      trim: true,
    }
  );

  const [min, _] = bigIntMinAndMax(initIndex + BigInt(count), total);

  for (
    let i = initIndex === BigInt(0) ? BigInt(0) : initIndex + BigInt(1);
    i < min;
    i++
  ) {
    const perm = getLargeKPermutationAtIndex(words, k, i.toString());
    // const result = perm.join(" ");
    const result = perm.join(" ");
    const isValid = Mnemonic.isValidMnemonic(result);

    if (isValid) {
      console.log(chalk.green(result));
      const promiseList = [];

      for (let j = 0; j < 5; j++) {
        promiseList.push(validateAccount(result, j));
      }
      console.log(promiseList.length);

      await Promise.all(promiseList);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } else {
      console.log(chalk.red(result));
    }

    if (i === min - BigInt(1)) {
      console.log(chalk.magenta("----------DONE----------"));
    }

    // Save to file
    updateKeyValueInFile("current_index", i, "src/data/store.txt");

    // sleep
  }
}

main(5000);
