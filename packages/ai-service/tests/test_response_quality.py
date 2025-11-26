"""
Test AI service response quality.

This test suite validates:
1. Response times meet <2s requirement
2. Explanation quality with sample topics
3. Caching mechanism works correctly

Requirements: 1.1, 7.1
"""
import pytest
import time
import asyncio
from httpx import AsyncClient
from app.main import app
from app.clients.redis_client import redis_client


class TestResponseTimes:
    """Test that response times meet the <2s requirement."""
    
    @pytest.mark.asyncio
    async def test_explanation_response_time_simple_topic(self, async_client, sample_simple_request):
        """Test response time for simple topic explanation."""
        start_time = time.time()
        
        response = await async_client.post("/explanations/", json=sample_simple_request)
        
        elapsed_time = time.time() - start_time
        
        assert response.status_code == 200, f"Request failed: {response.text}"
        assert elapsed_time < 2.0, f"Response time {elapsed_time:.2f}s exceeds 2s requirement"
        print(f"✓ Simple topic response time: {elapsed_time:.2f}s")
    
    @pytest.mark.asyncio
    async def test_explanation_response_time_complex_topic(self, async_client, sample_explanation_request):
        """Test response time for complex topic explanation."""
        start_time = time.time()
        
        response = await async_client.post("/explanations/", json=sample_explanation_request)
        
        elapsed_time = time.time() - start_time
        
        assert response.status_code == 200, f"Request failed: {response.text}"
        assert elapsed_time < 2.0, f"Response time {elapsed_time:.2f}s exceeds 2s requirement"
        print(f"✓ Complex topic response time: {elapsed_time:.2f}s")
    
    @pytest.mark.asyncio
    async def test_examples_endpoint_response_time(self, async_client):
        """Test response time for examples generation."""
        start_time = time.time()
        
        response = await async_client.get(
            "/explanations/examples",
            params={
                "topic": "Fractions",
                "subject": "Mathematics",
                "student_level": 5,
                "num_examples": 2
            }
        )
        
        elapsed_time = time.time() - start_time
        
        assert response.status_code == 200, f"Request failed: {response.text}"
        assert elapsed_time < 2.0, f"Response time {elapsed_time:.2f}s exceeds 2s requirement"
        print(f"✓ Examples endpoint response time: {elapsed_time:.2f}s")


class TestExplanationQuality:
    """Test explanation quality with sample topics."""
    
    @pytest.mark.asyncio
    async def test_explanation_contains_required_fields(self, async_client, sample_explanation_request):
        """Test that explanation response contains all required fields."""
        response = await async_client.post("/explanations/", json=sample_explanation_request)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        assert "content" in data, "Missing 'content' field"
        assert "examples" in data, "Missing 'examples' field"
        assert "related_topics" in data, "Missing 'related_topics' field"
        assert "difficulty" in data, "Missing 'difficulty' field"
        assert "estimated_read_time" in data, "Missing 'estimated_read_time' field"
        
        print(f"✓ All required fields present in response")
    
    @pytest.mark.asyncio
    async def test_explanation_content_not_empty(self, async_client, sample_explanation_request):
        """Test that explanation content is not empty."""
        response = await async_client.post("/explanations/", json=sample_explanation_request)
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["content"]) > 0, "Explanation content is empty"
        assert len(data["content"]) > 50, "Explanation content is too short"
        
        print(f"✓ Explanation content length: {len(data['content'])} characters")
    
    @pytest.mark.asyncio
    async def test_explanation_includes_examples(self, async_client, sample_explanation_request):
        """Test that explanation includes examples."""
        response = await async_client.post("/explanations/", json=sample_explanation_request)
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data["examples"], list), "Examples should be a list"
        assert len(data["examples"]) > 0, "No examples provided"
        
        # Verify example structure
        for example in data["examples"]:
            assert "problem" in example, "Example missing 'problem' field"
            assert "solution" in example, "Example missing 'solution' field"
        
        print(f"✓ Explanation includes {len(data['examples'])} examples")
    
    @pytest.mark.asyncio
    async def test_explanation_includes_related_topics(self, async_client, sample_explanation_request):
        """Test that explanation includes related topics."""
        response = await async_client.post("/explanations/", json=sample_explanation_request)
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data["related_topics"], list), "Related topics should be a list"
        assert len(data["related_topics"]) > 0, "No related topics provided"
        
        print(f"✓ Explanation includes {len(data['related_topics'])} related topics")
    
    @pytest.mark.asyncio
    async def test_explanation_adapts_to_student_level(self, async_client):
        """Test that explanations adapt to different student levels."""
        # Test for elementary level
        elementary_request = {
            "topic": "Multiplication",
            "subject": "Mathematics",
            "student_level": 3,
            "context": None,
            "previous_explanations": []
        }
        
        response_elementary = await async_client.post("/explanations/", json=elementary_request)
        assert response_elementary.status_code == 200
        data_elementary = response_elementary.json()
        
        # Test for high school level
        highschool_request = {
            "topic": "Multiplication",
            "subject": "Mathematics",
            "student_level": 11,
            "context": None,
            "previous_explanations": []
        }
        
        response_highschool = await async_client.post("/explanations/", json=highschool_request)
        assert response_highschool.status_code == 200
        data_highschool = response_highschool.json()
        
        # Verify difficulty levels are different
        assert data_elementary["difficulty"] != data_highschool["difficulty"], \
            "Difficulty should adapt to student level"
        
        print(f"✓ Elementary difficulty: {data_elementary['difficulty']}")
        print(f"✓ High school difficulty: {data_highschool['difficulty']}")
    
    @pytest.mark.asyncio
    async def test_examples_endpoint_quality(self, async_client):
        """Test examples endpoint returns quality examples."""
        response = await async_client.get(
            "/explanations/examples",
            params={
                "topic": "Photosynthesis",
                "subject": "Biology",
                "student_level": 7,
                "num_examples": 3
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "examples" in data, "Missing 'examples' field"
        assert len(data["examples"]) == 3, f"Expected 3 examples, got {len(data['examples'])}"
        
        # Verify each example has required structure
        for example in data["examples"]:
            assert "problem" in example, "Example missing 'problem' field"
            assert "solution" in example, "Example missing 'solution' field"
            assert len(example["problem"]) > 0, "Example problem is empty"
            assert len(example["solution"]) > 0, "Example solution is empty"
        
        print(f"✓ Generated {len(data['examples'])} quality examples")


class TestCachingMechanism:
    """Test that caching mechanism works correctly."""
    
    @pytest.mark.asyncio
    async def test_cached_response_faster_than_first(self, async_client, sample_simple_request):
        """Test that cached responses are faster than initial requests."""
        # First request (not cached)
        start_time_1 = time.time()
        response_1 = await async_client.post("/explanations/", json=sample_simple_request)
        elapsed_time_1 = time.time() - start_time_1
        
        assert response_1.status_code == 200
        data_1 = response_1.json()
        
        # Small delay to ensure cache is written
        await asyncio.sleep(0.1)
        
        # Second request (should be cached)
        start_time_2 = time.time()
        response_2 = await async_client.post("/explanations/", json=sample_simple_request)
        elapsed_time_2 = time.time() - start_time_2
        
        assert response_2.status_code == 200
        data_2 = response_2.json()
        
        # Verify responses are identical
        assert data_1["content"] == data_2["content"], "Cached response differs from original"
        
        # Cached response should be significantly faster
        print(f"✓ First request: {elapsed_time_1:.3f}s")
        print(f"✓ Cached request: {elapsed_time_2:.3f}s")
        print(f"✓ Speed improvement: {(elapsed_time_1 / elapsed_time_2):.1f}x faster")
        
        # Cached should be at least 2x faster or under 0.5s
        assert elapsed_time_2 < elapsed_time_1 or elapsed_time_2 < 0.5, \
            "Cached response not significantly faster"
    
    @pytest.mark.asyncio
    async def test_cache_key_uniqueness(self, async_client):
        """Test that different requests generate different cache keys."""
        request_1 = {
            "topic": "Algebra",
            "subject": "Mathematics",
            "student_level": 8,
            "context": None,
            "previous_explanations": []
        }
        
        request_2 = {
            "topic": "Geometry",
            "subject": "Mathematics",
            "student_level": 8,
            "context": None,
            "previous_explanations": []
        }
        
        response_1 = await async_client.post("/explanations/", json=request_1)
        response_2 = await async_client.post("/explanations/", json=request_2)
        
        assert response_1.status_code == 200
        assert response_2.status_code == 200
        
        data_1 = response_1.json()
        data_2 = response_2.json()
        
        # Verify responses are different
        assert data_1["content"] != data_2["content"], \
            "Different topics should not return same cached response"
        
        print(f"✓ Cache correctly differentiates between topics")
    
    @pytest.mark.asyncio
    async def test_cache_respects_student_level(self, async_client):
        """Test that cache respects student level differences."""
        request_level_5 = {
            "topic": "Fractions",
            "subject": "Mathematics",
            "student_level": 5,
            "context": None,
            "previous_explanations": []
        }
        
        request_level_10 = {
            "topic": "Fractions",
            "subject": "Mathematics",
            "student_level": 10,
            "context": None,
            "previous_explanations": []
        }
        
        response_5 = await async_client.post("/explanations/", json=request_level_5)
        response_10 = await async_client.post("/explanations/", json=request_level_10)
        
        assert response_5.status_code == 200
        assert response_10.status_code == 200
        
        data_5 = response_5.json()
        data_10 = response_10.json()
        
        # Verify responses are different for different levels
        assert data_5["difficulty"] != data_10["difficulty"], \
            "Cache should differentiate by student level"
        
        print(f"✓ Cache correctly differentiates by student level")


class TestHealthAndStatus:
    """Test health check and service status endpoints."""
    
    @pytest.mark.asyncio
    async def test_health_endpoint(self, async_client):
        """Test health check endpoint responds quickly."""
        start_time = time.time()
        
        response = await async_client.get("/health")
        
        elapsed_time = time.time() - start_time
        
        assert response.status_code == 200
        assert elapsed_time < 0.5, f"Health check too slow: {elapsed_time:.2f}s"
        
        data = response.json()
        assert data["status"] == "healthy"
        
        print(f"✓ Health check response time: {elapsed_time:.3f}s")
    
    @pytest.mark.asyncio
    async def test_root_endpoint(self, async_client):
        """Test root endpoint returns service info."""
        response = await async_client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "service" in data
        assert "version" in data
        assert "status" in data
        assert data["status"] == "running"
        
        print(f"✓ Service: {data['service']} v{data['version']}")


class TestErrorHandling:
    """Test error handling and edge cases."""
    
    @pytest.mark.asyncio
    async def test_invalid_student_level(self, async_client):
        """Test handling of invalid student level."""
        invalid_request = {
            "topic": "Test",
            "subject": "Mathematics",
            "student_level": 15,  # Invalid: should be 1-12
            "context": None,
            "previous_explanations": []
        }
        
        response = await async_client.post("/explanations/", json=invalid_request)
        
        # Should return validation error
        assert response.status_code == 422
        print(f"✓ Correctly rejects invalid student level")
    
    @pytest.mark.asyncio
    async def test_missing_required_fields(self, async_client):
        """Test handling of missing required fields."""
        incomplete_request = {
            "topic": "Test"
            # Missing subject and student_level
        }
        
        response = await async_client.post("/explanations/", json=incomplete_request)
        
        # Should return validation error
        assert response.status_code == 422
        print(f"✓ Correctly rejects incomplete request")
    
    @pytest.mark.asyncio
    async def test_empty_topic(self, async_client):
        """Test handling of empty topic."""
        empty_request = {
            "topic": "",
            "subject": "Mathematics",
            "student_level": 8,
            "context": None,
            "previous_explanations": []
        }
        
        response = await async_client.post("/explanations/", json=empty_request)
        
        # Should return validation error
        assert response.status_code == 422
        print(f"✓ Correctly rejects empty topic")
