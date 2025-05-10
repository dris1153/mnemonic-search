import * as fs from "fs";
import * as path from "path";

// Type definitions for supported value types
type ValueType = string | number | boolean | bigint;
type DefaultValueType = ValueType | undefined;

/**
 * Updates or creates a 'key=value' entry in a file, with support for BigInt
 *
 * @param key - The key to update or create
 * @param value - The value to set for the key (can be string, number, boolean, or bigint)
 * @param filePath - The path to the file (defaults to 'data/store.txt')
 * @returns A promise that resolves when the operation is complete
 */
export async function updateKeyValueInFile(
  key: string,
  value: ValueType,
  filePath: string = "data/store.txt"
): Promise<void> {
  try {
    // Validate inputs
    if (!key || key.trim() === "") {
      throw new Error("Key cannot be empty");
    }

    // Ensure key doesn't contain invalid characters
    if (/[=\r\n]/.test(key)) {
      throw new Error(
        'Key cannot contain "=", carriage return, or newline characters'
      );
    }

    // Convert value to string, with special handling for BigInt
    const stringValue =
      typeof value === "bigint"
        ? `${value.toString()}n` // Append 'n' to BigInt values to identify them later
        : String(value);

    // Ensure the directory exists
    const directory = path.dirname(filePath);
    await fs.promises.mkdir(directory, { recursive: true });

    let fileContent = "";
    let keyExists = false;

    // Check if the file exists and read its content
    try {
      fileContent = await fs.promises.readFile(filePath, "utf8");

      // Check if key already exists in the file
      const regex = new RegExp(`^${escapeRegExp(key)}=.*$`, "m");
      keyExists = regex.test(fileContent);

      if (keyExists) {
        // Replace the existing value
        fileContent = fileContent.replace(regex, `${key}=${stringValue}`);
      } else {
        // Add new entry (with a leading newline if the file has content)
        if (fileContent && !fileContent.endsWith("\n")) {
          fileContent += "\n";
        }
        fileContent += `${key}=${stringValue}`;
      }
    } catch (error) {
      // File doesn't exist, create new content
      if ((error as any)?.code === "ENOENT") {
        fileContent = `${key}=${stringValue}`;
      } else {
        // Some other error occurred
        throw error;
      }
    }

    // Write the updated content back to the file
    await fs.promises.writeFile(filePath, fileContent, "utf8");

    // console.log(
    //   keyExists
    //     ? `Updated ${key} to ${stringValue} in ${filePath}`
    //     : `Created ${key}=${stringValue} in ${filePath}`
    // );
  } catch (error) {
    console.error(`Error updating ${key}: ${(error as any)?.message}`);
    throw error;
  }
}

/**
 * Gets the value for a specific key from a file, with support for BigInt
 *
 * @param key - The key to look for
 * @param filePath - The path to the file (defaults to 'data/store.txt')
 * @param options - Optional configuration
 * @param options.ifNotExist - Default value to return if key doesn't exist
 * @param options.createIfMissing - Whether to create the key with the default value if it doesn't exist
 * @param options.trim - Whether to trim whitespace from the value (defaults to true)
 * @returns A promise that resolves to the value as a string, or the default value if specified
 */
async function getValueFromFile(
  key: string,
  filePath: string = "data/store.txt",
  options: {
    ifNotExist?: DefaultValueType;
    createIfMissing?: boolean;
    trim?: boolean;
  } = {}
): Promise<string> {
  const {
    ifNotExist = undefined,
    createIfMissing = false,
    trim = true,
  } = options;

  try {
    // Validate inputs
    if (!key || key.trim() === "") {
      throw new Error("Key cannot be empty");
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      if (ifNotExist !== undefined && createIfMissing) {
        // Create the file with the default value
        const directory = path.dirname(filePath);
        await fs.promises.mkdir(directory, { recursive: true });

        // Special handling for BigInt default values
        const stringValue =
          typeof ifNotExist === "bigint"
            ? `${ifNotExist.toString()}n`
            : String(ifNotExist);

        await fs.promises.writeFile(filePath, `${key}=${stringValue}`, "utf8");
        console.log(`Created file ${filePath} with ${key}=${stringValue}`);
        return stringValue;
      } else if (ifNotExist !== undefined) {
        // Return default value without creating file
        console.log(
          `File ${filePath} not found, returning default value for ${key}`
        );
        return typeof ifNotExist === "bigint"
          ? `${ifNotExist.toString()}n`
          : String(ifNotExist);
      } else {
        throw new Error(`File not found: ${filePath}`);
      }
    }

    // Read file content
    const fileContent = await fs.promises.readFile(filePath, "utf8");

    // Look for the key
    const regex = new RegExp(`^${escapeRegExp(key)}=(.*)$`, "m");
    const match = fileContent.match(regex);

    if (match) {
      // Key found, return its value
      const value = trim ? match[1].trim() : match[1];
      return value;
    } else if (ifNotExist !== undefined) {
      // Key not found, but default value provided
      if (createIfMissing) {
        // Add the key with default value to the file
        let newContent = fileContent;
        if (newContent && !newContent.endsWith("\n")) {
          newContent += "\n";
        }

        // Special handling for BigInt default values
        const stringValue =
          typeof ifNotExist === "bigint"
            ? `${ifNotExist.toString()}n`
            : String(ifNotExist);

        newContent += `${key}=${stringValue}`;

        await fs.promises.writeFile(filePath, newContent, "utf8");
        console.log(`Added ${key}=${stringValue} to ${filePath}`);
        return stringValue;
      }
      return typeof ifNotExist === "bigint"
        ? `${ifNotExist.toString()}n`
        : String(ifNotExist);
    } else {
      // Key not found and no default value
      throw new Error(`Key not found: ${key}`);
    }
  } catch (error) {
    if (
      (error as any)?.message === `Key not found: ${key}` &&
      ifNotExist !== undefined
    ) {
      return typeof ifNotExist === "bigint"
        ? `${ifNotExist.toString()}n`
        : String(ifNotExist);
    }
    console.error(`Error getting value for ${key}: ${(error as any)?.message}`);
    throw error;
  }
}

/**
 * Gets a value as a specific type
 */
export async function getValueAsNumber(
  key: string,
  filePath?: string,
  options?: { ifNotExist?: number; createIfMissing?: boolean; trim?: boolean }
): Promise<number> {
  const value = await getValueFromFile(key, filePath, options);
  return Number(value);
}

export async function getValueAsBoolean(
  key: string,
  filePath?: string,
  options?: { ifNotExist?: boolean; createIfMissing?: boolean; trim?: boolean }
): Promise<boolean> {
  const value = await getValueFromFile(key, filePath, options);
  return value.toLowerCase() === "true";
}

/**
 * Gets a value as a BigInt
 *
 * @param key - The key to look for
 * @param filePath - The path to the file
 * @param options - Optional configuration
 * @returns The value as a BigInt
 */
export async function getValueAsBigInt(
  key: string,
  filePath?: string,
  options?: { ifNotExist?: bigint; createIfMissing?: boolean; trim?: boolean }
): Promise<bigint> {
  const value = await getValueFromFile(key, filePath, options);
  // Check if the value ends with 'n' (our marker for BigInt values)
  if (value.endsWith("n")) {
    return BigInt(value.slice(0, -1));
  }
  return BigInt(value);
}

/**
 * Escapes special characters in a string for use in a regular expression
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
