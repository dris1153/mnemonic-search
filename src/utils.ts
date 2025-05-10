import { HDNodeWallet, Mnemonic } from "ethers";

export function getPrivateKeyFromMnemonic(
  mnemonic: string,
  path: string = "m/44'/60'/0'/0",
  index: number = 0
): {
  privateKey: string;
  address: string;
  mnemonic: Mnemonic;
} {
  try {
    // Create a mnemonic instance
    const mnemonicObj = Mnemonic.fromPhrase(mnemonic);

    // Create HD wallet from mnemonic
    const hdNode = HDNodeWallet.fromMnemonic(mnemonicObj, path);

    // Derive the child wallet at the specified index
    const wallet = hdNode.deriveChild(index);

    return {
      privateKey: wallet.privateKey,
      address: wallet.address,
      mnemonic: mnemonicObj,
    };
  } catch (error) {
    throw new Error(`Failed to derive private key: ${(error as any)?.message}`);
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
export function getLargeKPermutationAtIndex<T>(
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
export function permutationCountBig(n: number, k: number): bigint {
  if (k > n) return BigInt(0);
  if (k === 0) return BigInt(1);

  let result = BigInt(1);
  for (let i = 0; i < k; i++) {
    result *= BigInt(n - i);
  }
  return result;
}

// Usage with lazy-loading of elements for memory efficiency
export function getKPermutationForLargeDataset<T>(
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

export const bigIntMinAndMax = (...args: bigint[]): [bigint, bigint] => {
  return args.reduce(
    ([min, max], e) => {
      return [e < min ? e : min, e > max ? e : max];
    },
    [args[0], args[0]]
  );
};
