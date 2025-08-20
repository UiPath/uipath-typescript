#!/usr/bin/env node

import { config } from 'dotenv';
import { run } from '@oclif/core';

// Load environment variables from .env file
config();

await run(process.argv.slice(2), import.meta.url);