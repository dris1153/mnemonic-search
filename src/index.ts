import { readFile } from "fs/promises";
import ethers, { Mnemonic } from "ethers";
import { factorial } from "mathjs";
import { permutations } from "obliterator";
import { Permutation } from "js-combinatorics";

const filePath = __dirname + "/word.txt";

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

/**
 * Gets a specific k-permutation by index from a set of n elements
 * Optimized for extremely large values of n (e.g., 2048)
 * Uses BigInt to handle large numerical calculations
 *
 * @param elements Array of elements to choose from
 * @param k Number of elements to select
 * @param indexStr Index of the permutation as a string (can be a very large number)
 * @returns Array containing the k-permutation at the specified index
 */
function getLargeKPermutationAtIndex<T>(
  elements: T[],
  k: number,
  indexStr: string
): T[] {
  const n = elements.length;

  // Convert index to BigInt
  let index = BigInt(indexStr);

  // Validate input
  if (k > n) {
    throw new Error(`k (${k}) cannot be greater than n (${n})`);
  }

  // Calculate total number of k-permutations
  const totalPermutations = permutationCountBig(n, k);
  if (index < BigInt(0) || index >= totalPermutations) {
    throw new Error(
      `Index ${indexStr} is out of bounds (0 to ${
        totalPermutations - BigInt(1)
      })`
    );
  }

  // Create a copy of the elements array to work with
  const availableElements = [...elements];
  const result: T[] = [];

  // For each position in the result
  for (let i = 0; i < k; i++) {
    // Calculate size of each block for this position
    const blockSize = permutationCountBig(n - i - 1, k - i - 1);

    // Calculate which element goes in the current position
    const position = Number(index / blockSize); // Convert to Number for array indexing
    index = index % blockSize;

    // Add the chosen element to the result
    result.push(availableElements[position]);

    // Remove the chosen element from available elements
    availableElements.splice(position, 1);
  }

  return result;
}

/**
 * Calculates the number of ways to select k elements from n elements
 * and arrange them in different orders (P(n,k))
 * Uses BigInt for handling extremely large numbers
 */
function permutationCountBig(n: number, k: number): bigint {
  if (k > n) return BigInt(0);
  if (k === 0) return BigInt(1);

  let result = BigInt(1);
  for (let i = 0; i < k; i++) {
    result *= BigInt(n - i);
  }
  return result;
}

// Usage with lazy-loading of elements for memory efficiency
function getKPermutationForLargeDataset<T>(
  getElementFn: (index: number) => T, // Function to get element at index
  n: number, // Total number of elements
  k: number, // Number of elements to select
  indexStr: string // Index of permutation to retrieve
): T[] {
  // Validate input
  if (k > n) {
    throw new Error(`k (${k}) cannot be greater than n (${n})`);
  }

  // Convert index to BigInt
  let index = BigInt(indexStr);

  // Calculate total number of k-permutations
  const totalPermutations = permutationCountBig(n, k);
  if (index < BigInt(0) || index >= totalPermutations) {
    throw new Error(
      `Index ${indexStr} is out of bounds (0 to ${
        totalPermutations - BigInt(1)
      })`
    );
  }

  // Initialize tracking of available indices
  const availableIndices = new Set<number>();
  for (let i = 0; i < n; i++) {
    availableIndices.add(i);
  }

  const result: T[] = [];

  // For each position in the result
  for (let i = 0; i < k; i++) {
    // Calculate size of each block for this position
    const blockSize = permutationCountBig(n - i - 1, k - i - 1);

    // Calculate which available index to use
    const position = Number(index / blockSize);
    index = index % blockSize;

    // Find the element at the calculated position from available indices
    let currentPos = 0;
    let selectedIndex: number | undefined;

    for (const availableIndex of availableIndices) {
      if (currentPos === position) {
        selectedIndex = availableIndex;
        break;
      }
      currentPos++;
    }

    if (selectedIndex === undefined) {
      throw new Error(
        `Algorithm error: could not find element at position ${position}`
      );
    }

    // Add the chosen element to the result
    result.push(getElementFn(selectedIndex));

    // Remove the chosen index from available indices
    availableIndices.delete(selectedIndex);
  }

  return result;
}

async function main() {
  const words = await readWordFile();
  if (!words) {
    console.error("No words found in the file.");
    return;
  }
  const n = words.length; // 20 elements
  const k = 12;
  const maxPerFile = 100000; // 1 million

  // Calculate the total number of permutations
  const total = permutationCountBig(n, k);
  console.log(`Total ${k}-permutations from ${n} elements: ${total}`);

  for (let i = BigInt(0); i < total; i++) {
    const perm = getLargeKPermutationAtIndex(words, k, i.toString());
    const result = perm.join(" ");
    console.log(`Permutation at index ${i}:`, result);
    // const wallets = ethers.Wallet.fromPhrase(result);
    const v = Mnemonic.isValidMnemonic(result);
    console.log("Wallets:", v);

    // Save to file
    // sleep 1s
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

main();
