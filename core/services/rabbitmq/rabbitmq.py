"""
RabbitMQ Service Module.

This module handles the connection to RabbitMQ, initialization of exchanges,
and publishing of events. It uses aio_pika for asynchronous AMQP communication.
"""
import json
import aio_pika
from .config import get_rabbitmq_settings

async def get_rabbitmq_connection():
    """
    Establishes a robust connection to RabbitMQ.

    Returns:
        aio_pika.RobustConnection: The active RabbitMQ connection.
    """
    settings = get_rabbitmq_settings()
    # connect_robust automatically handles reconnection logic if the broker goes down.
    connection = await aio_pika.connect_robust(settings.rabbitmq_url)
    return connection


async def init_rabbitmq():
    """
    Initializes RabbitMQ resources on application startup.
    
    It connects to the broker and declares the required exchange to ensure
    it exists before any messages are published.
    """
    try:
        connection = await get_rabbitmq_connection()
        async with connection:
            channel = await connection.channel()
            # Declare the topic exchange. This is idempotent (won't fail if it exists with same settings).
            await channel.declare_exchange(
                name="cinematch.events",
                type=aio_pika.ExchangeType.TOPIC,
                durable=True,
            )
        print("[RabbitMQ] Successfully connected and declared exchange 'cinematch.events'.", flush=True)
    except Exception as e:
        # Log critical failure (e.g., broker not reachable).
        print(f"[RabbitMQ] CRITICAL: Failed to connect to RabbitMQ during startup: {e}", flush=True)

async def publish_movie_event(event_action: str, payload: dict):
    """
    Publishes a movie-related event to the RabbitMQ exchange.

    Args:
        event_action (str): The specific action (e.g., 'created', 'updated').
                            Used to construct the routing key: 'movie.<action>'.
        payload (dict): The data to send in the message body.
    """
    connection = await get_rabbitmq_connection()

    async with connection:
        channel = await connection.channel()

        # Declare the exchange to ensure it exists before publishing.
        # We use declare_exchange instead of get_exchange because we are passing configuration parameters.
        exchange = await channel.declare_exchange(
            name = "cinematch.events",
            type = aio_pika.ExchangeType.TOPIC,
            durable = True,
        )

        # Serialize the payload to JSON bytes.
        message_body = json.dumps(payload).encode("utf-8")

        message = aio_pika.Message(
            body=message_body,
            # PERSISTENT delivery mode ensures messages are saved to disk by RabbitMQ.
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
        )

        routing_key = f"movie.{event_action}"

        await exchange.publish(message, routing_key=routing_key)
        print(f"[RabbitMQ] Successfully published event: {routing_key}", flush=True)