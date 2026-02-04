"""Setup script for benchx."""

from setuptools import setup, find_packages

setup(
    name="benchx",
    version="0.1.0",
    packages=find_packages(include=["benchx", "benchx.*"]),
    python_requires=">=3.9",
)
