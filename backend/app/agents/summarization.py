from app.utils.oa_client import oa_client


async def generate_summary(text: str):
    user_prompt = f"""
    Berikut adalah sebuah dokumen yang perlu diringkas:

    {text}
    """

    response = oa_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "Kamu adalah asisten AI yang ahli dalam membuat ringkasan dokumen secara akurat dan komprehensif.",
            },
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.5,
    )

    return response.choices[0].message.content
