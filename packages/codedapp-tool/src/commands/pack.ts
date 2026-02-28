import type { Command } from "commander";
import { executePack } from "@uipath/uipath-ts-cli/actions";

export const registerPackCommand = (program: Command): void => {
  program
    .command("pack <dist>")
    .description("Package app into .nupkg")
    .option("-n, --name <name>", "Package name")
    .option("-v, --version <version>", "Package version", "1.0.0")
    .option("-o, --output <dir>", "Output directory", "./.uipath")
    .option("-a, --author <author>", "Package author", "UiPath Developer")
    .option("--description <desc>", "Package description")
    .option("--main-file <file>", "Main entry file", "index.html")
    .option("--content-type <type>", "Content type (webapp, library, process)", "webapp")
    .option("--dry-run", "Show what would be packaged without creating the package")
    .action(async (dist: string, options: Record<string, unknown>) => {
      await executePack({
        dist,
        name: options.name as string | undefined,
        version: options.version as string | undefined,
        output: options.output as string | undefined,
        author: options.author as string | undefined,
        description: options.description as string | undefined,
        mainFile: options.mainFile as string | undefined,
        contentType: options.contentType as string | undefined,
        dryRun: options.dryRun as boolean | undefined,
      });
    });
};
