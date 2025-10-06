#!/bin/bash

# Script para testar mensagem Kafka
PRINTER_ID="0d31f2f9a6525f56"

echo "📨 Enviando mensagem Kafka para impressora: $PRINTER_ID"

# Mensagem JSON (PDF base64 mínimo)
MESSAGE='{"printerId":"'$PRINTER_ID'","fileBase64":"JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlIC9QYWdlCi9QYXJlbnQgMSAwIFIKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KL0NvbnRlbnRzIDQgMCBSCi9SZXNvdXJjZXMgPDwKL1Byb2NTZXQgWy9QREYgL1RleHRdCi9Gb250IDw8Ci9GMSA2IDAgUgo+Pgo+Pgo+PgplbmRvYmoKNCAwIG9iago8PC9MZW5ndGggNDQ+PgpzdHJlYW0KQlQKL0YxIDI0IFRmCjEwMCA3MDAgVGQKKFRlc3RlIEthZmthKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCjYgMCBvYmoKPDwvVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTEKL0Jhc2VGb250IC9IZWx2ZXRpY2EKPj4KZW5kb2JqCjEgMCBvYmoKPDwvVHlwZSAvUGFnZXMKL0NvdW50IDEKL0tpZHMgWzMgMCBSXQo+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlIC9DYXRhbG9nCi9QYWdlcyAxIDAgUgo+PgplbmRvYmoKdHJhaWxlcgo8PC9TaXplIDcKL1Jvb3QgMiAwIFIKPj4Kc3RhcnR4cmVmCjU1NQolJUVPRgo="}'

echo "$MESSAGE" | docker exec -i kafka sh -c "/opt/kafka/bin/kafka-console-producer.sh --topic print-jobs --bootstrap-server localhost:9092"

echo "✅ Mensagem enviada! Verificando logs..."
sleep 2
docker logs printers-api --tail=10
