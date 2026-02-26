# kiki

Tiny Python library exposing convenient Keras layer constructors.

## Usage

```python
from kiki import Linear, CNNLayer

dense = Linear(64, activation="relu")
conv = CNNLayer(32, (3, 3), activation="relu")
```
