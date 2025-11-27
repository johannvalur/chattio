/**
 * Vendored copy of @jest/test-sequencer (MIT, Meta Platforms, Inc. and affiliates)
 * to work around macOS provenance restrictions that prevent reading the package directly.
 */
'use strict';

const crypto = require('crypto');
const path = require('path');
const fs = require('graceful-fs');
const slash = require('slash');
const HasteMapModule = require('jest-haste-map');
const HasteMap = HasteMapModule.default || HasteMapModule;

const FAIL = 0;
const SUCCESS = 1;

class TestSequencer {
	constructor() {
		this._cache = new Map();
	}

	_getCachePath(testContext) {
		const { config } = testContext;
		const HasteMapClass = HasteMap.getStatic(config);
		return HasteMapClass.getCacheFilePath(
			config.cacheDirectory,
			`perf-cache-${config.id}`
		);
	}

	_getCache(test) {
		const { context } = test;
		if (!this._cache.has(context) && context.config.cache) {
			const cachePath = this._getCachePath(context);
			if (fs.existsSync(cachePath)) {
				try {
					this._cache.set(
						context,
						JSON.parse(fs.readFileSync(cachePath, 'utf8'))
					);
				} catch {
					// ignore corrupted cache entries
				}
			}
		}

		let cache = this._cache.get(context);
		if (!cache) {
			cache = {};
			this._cache.set(context, cache);
		}
		return cache;
	}

	_shardPosition(options) {
		const shardRest = options.suiteLength % options.shardCount;
		const ratio = options.suiteLength / options.shardCount;
		return new Array(options.shardIndex)
			.fill(true)
			.reduce((acc, _, shardIndex) => {
				const dangles = shardIndex < shardRest;
				const shardSize = dangles ? Math.ceil(ratio) : Math.floor(ratio);
				return acc + shardSize;
			}, 0);
	}

	shard(tests, options) {
		const shardStart = this._shardPosition({
			shardCount: options.shardCount,
			shardIndex: options.shardIndex - 1,
			suiteLength: tests.length
		});
		const shardEnd = this._shardPosition({
			shardCount: options.shardCount,
			shardIndex: options.shardIndex,
			suiteLength: tests.length
		});
		return tests
			.map(test => {
				const relativeTestPath = path.posix.relative(
					slash(test.context.config.rootDir),
					slash(test.path)
				);
				return {
					hash: crypto.createHash('sha1').update(relativeTestPath).digest('hex'),
					test
				};
			})
			.sort((a, b) => (a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : 0))
			.slice(shardStart, shardEnd)
			.map(result => result.test);
	}

	sort(tests) {
		const stats = {};
		const fileSize = ({ path: testPath, context: { hasteFS } }) =>
			stats[testPath] || (stats[testPath] = hasteFS.getSize(testPath) ?? 0);
		tests.forEach(test => {
			test.duration = this.time(test);
		});
		return tests.sort((testA, testB) => {
			const failedA = this.hasFailed(testA);
			const failedB = this.hasFailed(testB);
			const hasTimeA = testA.duration != null;
			if (failedA !== failedB) {
				return failedA ? -1 : 1;
			} else if (hasTimeA !== (testB.duration != null)) {
				return hasTimeA ? 1 : -1;
			} else if (testA.duration != null && testB.duration != null) {
				return testA.duration < testB.duration ? 1 : -1;
			} else {
				return fileSize(testA) < fileSize(testB) ? 1 : -1;
			}
		});
	}

	allFailedTests(tests) {
		return this.sort(tests.filter(test => this.hasFailed(test)));
	}

	cacheResults(tests, results) {
		const map = Object.create(null);
		tests.forEach(test => (map[test.path] = test));
		results.testResults.forEach(testResult => {
			const test = map[testResult.testFilePath];
			if (test != null && !testResult.skipped) {
				const cache = this._getCache(test);
				const perf = testResult.perfStats;
				const testRuntime =
					perf.runtime ?? test.duration ?? perf.end - perf.start;
				cache[testResult.testFilePath] = [
					testResult.numFailingTests > 0 ? FAIL : SUCCESS,
					testRuntime || 0
				];
			}
		});
		this._cache.forEach((cache, context) => {
			fs.writeFileSync(this._getCachePath(context), JSON.stringify(cache));
		});
	}

	hasFailed(test) {
		const cache = this._getCache(test);
		return cache[test.path]?.[0] === FAIL;
	}

	time(test) {
		const cache = this._getCache(test);
		return cache[test.path]?.[1];
	}
}

module.exports = {
	__esModule: true,
	default: TestSequencer
};

