import chalk from "chalk";
import { loadModelsCatalog, Model } from "../../utils/models-catalog-loader";

export const listModelsCommand = () => {
  try {
    const catalog = loadModelsCatalog();

    console.log(chalk.bold("Available AI Models:"));
    console.log("");

    for (const providerKey in catalog.providers) {
      if (Object.prototype.hasOwnProperty.call(catalog.providers, providerKey)) {
        const provider = catalog.providers[providerKey];
        console.log(chalk.blue.bold(`Provider: ${provider.name}`));
        console.log(chalk.gray(`  API Key Environment Variable: ${provider.apiKeyEnv}`));

        if (provider.models.length > 0) {
          provider.models.forEach((model: Model) => {
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
