# Change Log

## [Unreleased]
### Added
- `Disposable()` mixin

`Disposable()` mixin injects to class
- `.subscribe()` method, an alias for `subscribe()` utility function
- `.dispose()` method. It disposes all subscription created by `.subscribe()` method
- `.unwrap()` method, an alias for `unwrap()` utility function

## [0.9.1] - 2017-02-01
### Added
- `@reactive` (deep observable) decorator. It can be used for recursively
  observing nested object's properties (see #3)
- `@event` decorator. It creates hidden `ko.subscribable` for class property
- `ObservableArray.set(index, value)` method
- `ObservableArray.mutate(() => {...})` method

### Changed
- `subscribe()` function can be used with `@event` decorator
- `subscribe()` function can subscribe to `"arrayChange"` Knockout event

## [0.8.0] - 2017-01-22
### Added
- `subscribe(() => this.observableProp, (value) => { ... })` function

### Changed
- `@extend` decorator now can be combined with `@computed` decorator

### Removed
- `@subscribe` decorator
- `@reaction` decorator

Native `ko.computed` with side effects can be used in all places where we use
`@reaction` or `@observer` decorator.

In v0.7.1 and earlier `@subscribe` decorator can be used only with `@observable` 
but not with `@computed`. To avoid this restriction we can create `ko.pureComputed`
and subscribe to it:
```js
class ViewModel {
  @computed get computedProp() { ... }

  constructor() {
    ko.pureComputed(() => this.computedProp).subscribe((value) => { ... });
  }
}
```

So from v0.8.0 instead of `@subscribe` decorator there is shorthand function `subscribe`
with some extra functionality like "subscribe once":
```js
class ViewModel {
  @computed get computedProp() { ... }

  constructor() {
    subscribe(() => this.computedProp, (value) => { ... });
  }
}
```

## [0.7.1] - 2017-01-22
### Changed
- Renamed `@observer` decorator to `@reaction`

## [0.6.0] - 2016-12-11
### Added
- `unwrap(this, "observablePropName")` function for getting internal observable (see #1)

## [0.5.0] - 2016-12-10
### Changed
- Upgraded TypeScript dependency to v2
- Upgraded Type Definitions

## [0.4.2] - 2016-10-05
### Added
- `@observable` decorator
- `@observableArray` decorator
- `@computed` decorator
- `@observer` decorator
- `@extend` decorator
- `@subscribe` decorator
- `@component` decorator

[Unreleased]: https://github.com/gnaeus/knockout-decorators/compare/0.9.1...HEAD
[0.9.1]: https://github.com/gnaeus/knockout-decorators/compare/0.8.0..0.9.1
[0.8.0]: https://github.com/gnaeus/knockout-decorators/compare/0.7.1...0.8.0
[0.7.1]: https://github.com/gnaeus/knockout-decorators/compare/0.6.0...0.7.1
[0.6.0]: https://github.com/gnaeus/knockout-decorators/compare/0.5.0...0.6.0
[0.5.0]: https://github.com/gnaeus/knockout-decorators/compare/0.4.2...0.5.0
[0.4.2]: https://github.com/gnaeus/knockout-decorators/tree/0.4.2
