#!/usr/bin/env node

import { config } from 'dotenv';
import { run } from '@oclif/core';

// Load environment variables from .env file
config({ quiet: true });

await run(process.argv.slice(2), import.meta.url);