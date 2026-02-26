"""Small Keras layer helpers."""

from keras.layers import Conv2D, Dense


def Linear(units, activation=None, **kwargs):
    """Return a Keras Dense layer (linear-style layer)."""
    return Dense(units=units, activation=activation, **kwargs)


def CNNLayer(filters, kernel_size, activation="relu", **kwargs):
    """Return a Keras Conv2D layer."""
    return Conv2D(
        filters=filters,
        kernel_size=kernel_size,
        activation=activation,
        **kwargs,
    )
