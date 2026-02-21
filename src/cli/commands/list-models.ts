import fs from "fs";
import path from "path";
import chalk from "chalk";

interface Model {
  id: string;
  name: string;
  description: string;
  recommended?: boolean;
}

interface Provider {
  name: string;
  apiKeyEnv: string;
  models: Model[];
}

interface ModelsCatalog {
  providers: { [key: string]: Provider };
}

export const listModelsCommand = () => {
  const modelsCatalogPath = path.join(__dirname, "../../../src/data/models-catalog.json");
  try {
    const data = fs.readFileSync(modelsCatalogPath, "utf8");
    const catalog: ModelsCatalog = JSON.parse(data);

    console.log(chalk.bold("Available AI Models:"));
    console.log("");

    for (const providerKey in catalog.providers) {
      if (Object.prototype.hasOwnProperty.call(catalog.providers, providerKey)) {
        const provider = catalog.providers[providerKey];
        console.log(chalk.blue.bold(`Provider: ${provider.name}`));
        console.log(chalk.gray(`  API Key Environment Variable: ${provider.apiKeyEnv}`));

        if (provider.models.length > 0) {
          provider.models.forEach((model) => {
            let modelOutput = `    ${chalk.green(model.name)} (${model.id})`;
            if (model.recommended) {
              modelOutput += chalk.yellow(" (Recommended)");
            }
            modelOutput += `: ${model.description}`;
            console.log(modelOutput);
          });
        } else {
          console.log(chalk.dim("    No models available for this provider."));
        }
        console.log("");
      }
    }
  } catch (error) {
    console.error(chalk.red("Error loading models catalog:"), error);
  }
};
